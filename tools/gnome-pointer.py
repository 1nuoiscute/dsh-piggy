#!/usr/bin/env python3
"""GNOME（Wayland）下注入真实鼠标：走 Mutter 的 RemoteDesktop D-Bus 接口（GNOME 远程桌面同一条路）。

ydotool 在新版 udev 下会被认成纯键盘、GNOME 不把它当鼠标，所以桌面版的真拖动测试用这个。
从 stdin 逐行读命令，每条执行完回一行 ok：
  move X Y     指针移到屏幕绝对坐标（逻辑像素）
  down / up    左键按下 / 松开
  sleep MS     等一会儿
stdin 关掉就结束会话（会话挂着录屏流，别长时间开着）。
"""
import sys
import gi
gi.require_version('Gio', '2.0')
from gi.repository import Gio, GLib

BUS = Gio.bus_get_sync(Gio.BusType.SESSION)
BTN_LEFT = 0x110


def call(path, iface, method, args=None, reply='()'):
    return BUS.call_sync(_dest(iface), path, iface, method,
                         args, GLib.VariantType(reply), Gio.DBusCallFlags.NONE, -1, None)


def _dest(iface):
    return 'org.gnome.Mutter.RemoteDesktop' if 'RemoteDesktop' in iface else 'org.gnome.Mutter.ScreenCast'


rd_path = call('/org/gnome/Mutter/RemoteDesktop', 'org.gnome.Mutter.RemoteDesktop', 'CreateSession', None, '(o)').unpack()[0]
rd_id = BUS.call_sync('org.gnome.Mutter.RemoteDesktop', rd_path, 'org.freedesktop.DBus.Properties', 'Get',
                      GLib.Variant('(ss)', ('org.gnome.Mutter.RemoteDesktop.Session', 'SessionId')),
                      GLib.VariantType('(v)'), Gio.DBusCallFlags.NONE, -1, None).unpack()[0]
sc_path = call('/org/gnome/Mutter/ScreenCast', 'org.gnome.Mutter.ScreenCast', 'CreateSession',
               GLib.Variant('(a{sv})', ({'remote-desktop-session-id': GLib.Variant('s', rd_id)},)), '(o)').unpack()[0]
# 录主显示器（不需要真的取画面，只是绝对坐标要挂在一个 stream 上）
connector = sys.argv[1] if len(sys.argv) > 1 else 'Virtual-1'
stream = call(sc_path, 'org.gnome.Mutter.ScreenCast.Session', 'RecordMonitor',
              GLib.Variant('(sa{sv})', (connector, {})), '(o)').unpack()[0]
call(rd_path, 'org.gnome.Mutter.RemoteDesktop.Session', 'Start')

ctx = GLib.MainContext.default()
for _ in range(50):
    ctx.iteration(False)

print('ready', flush=True)
for line in sys.stdin:
    parts = line.split()
    if not parts:
        continue
    if parts[0] == 'sleep':
        import time
        time.sleep(int(parts[1]) / 1000)
    elif parts[0] == 'move':
        call(rd_path, 'org.gnome.Mutter.RemoteDesktop.Session', 'NotifyPointerMotionAbsolute',
             GLib.Variant('(sdd)', (stream, float(parts[1]), float(parts[2]))))
    elif parts[0] in ('down', 'up'):
        call(rd_path, 'org.gnome.Mutter.RemoteDesktop.Session', 'NotifyPointerButton',
             GLib.Variant('(ib)', (BTN_LEFT, parts[0] == 'down')))
    for _ in range(5):
        ctx.iteration(False)
    print('ok', flush=True)
call(rd_path, 'org.gnome.Mutter.RemoteDesktop.Session', 'Stop')
