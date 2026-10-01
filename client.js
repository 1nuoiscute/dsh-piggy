// GENERATED FILE. Edit src/client/ and run `npm run build`; do not edit by hand.
(() => {
  // src/client/constants.js
  var STATE_URL = "/dsh-piggy/state";
  var ART_URL = "/dsh-piggy/art/";
  var ACT_URL = "/dsh-piggy/act";
  var POLL_MS = 4e3;
  var IDLE_CHAT_MINUTES = { min: 20, max: 40 };
  var GREET_DELAY_MS = 1500;
  var MOUNTED = "data-dsh-pig";
  var OPEN_KEY = "dsh-piggy:open";
  var POSITION_KEY = "dsh-piggy:position";
  var PANEL_WIDTH = 292;
  var PANEL_GAP = 8;
  var PANEL_MARGIN = 10;
  var PANEL_MIN_HEIGHT = 120;
  var SCENE_RESERVE = 132;
  var PIG_PADDING_X = 6;
  var TABS = [
    { key: "status", label: "\u72B6\u6001", emoji: "\u{1F4CB}" },
    { key: "card", label: "\u5C45\u6C11\u5361", emoji: "\u{1FAAA}" },
    { key: "crown", label: "\u52A0\u5195", emoji: "\u{1F451}" },
    { key: "study", label: "\u5B66\u4E60", emoji: "\u{1F4DA}" },
    { key: "work", label: "\u6253\u5DE5", emoji: "\u{1F4BC}" },
    { key: "shop", label: "\u5546\u5E97", emoji: "\u{1F6D2}" },
    { key: "travel", label: "\u65C5\u884C", emoji: "\u{1F9F3}" },
    { key: "bag", label: "\u80CC\u5305", emoji: "\u{1F392}" }
  ];
  var DEV_KEY = "dsh-piggy:dev";
  var DEV_TAB = { key: "dev", label: "\u8C03\u8BD5", emoji: "\u{1F527}" };
  var UPDATE_TAB = { key: "update", label: "\u66F4\u65B0", emoji: "\u{1F504}" };
  var QUIT_TAB = { key: "quit", label: "\u9000\u51FA", emoji: "\u{1F44B}" };
  var PET_LINES = [
    "\u597D\u8212\u670D\u2026",
    "\u518D\u6478\u6478\uFF5E",
    "\u563F\u563F",
    "\u547C\u565C\u547C\u565C\u2026",
    "\u8FD9\u91CC\u8FD9\u91CC\uFF01",
    "\uFF08\u772F\u8D77\u773C\u775B\uFF09",
    "\u4ECA\u5929\u5FC3\u60C5\u4E0D\u9519",
    "\u5514\u2026\u597D\u75D2",
    "\u4F60\u5728\u5FD9\u4EC0\u4E48\u5440",
    "\u518D\u591A\u5F85\u4E00\u4F1A\u513F"
  ];
  var MODES = ["feed", "bathe", "play", "pet"];
  var CARE_LABEL = { feed: ["\u5582\u98DF", "\u{1F34E}"], bathe: ["\u6D17\u6FA1", "\u{1F6C1}"], play: ["\u73A9\u800D", "\u{1F3BE}"], pet: ["\u6478\u6478", "\u2764\uFE0F"] };
  var BOX_POKES_TO_OPEN = 3;
  var BOX_POKE_LINES = [
    "\u91CC\u9762\u597D\u50CF\u6709\u4E1C\u897F\u2026",
    "\u52A8\u4E86\uFF01\u518D\u6233\u4E00\u4E0B\uFF01"
  ];
  var NO_ITEM_LINE = {
    food: "\u6CA1\u6709\u5403\u7684\u5566\uFF0C\u5FEB\u53BB\u4E70\u4E00\u70B9 \u{1F34E}",
    bath: "\u6CA1\u6709\u6D17\u6D74\u7528\u54C1\u4E86\uFF0C\u53BB\u4E70\u70B9\u5427 \u{1F9FC}",
    toy: "\u6CA1\u6709\u73A9\u5177\u4E86\uFF0C\u53BB\u5546\u5E97\u770B\u770B \u{1FA80}"
  };
  var KIND_TITLE = { food: "\u{1F34E} \u98DF\u7269", bath: "\u{1F9FC} \u6D17\u6D74", toy: "\u{1FA80} \u73A9\u5177", dress: "\u{1F455} \u88C5\u626E", medicine: "\u{1F48A} \u836F\u54C1", revive: "\u2728 \u590D\u6D3B", contract: "\u{1F4DC} \u5951\u7EA6" };
  var KIND_ORDER = ["food", "bath", "toy", "dress", "medicine", "revive", "contract"];
  var STAGES = [
    { key: "preschool", label: "\u5E7C\u513F\u56ED" },
    { key: "extracurricular", label: "\u8BFE\u5916" },
    { key: "primary", label: "\u5C0F\u5B66" },
    { key: "middle", label: "\u4E2D\u5B66" },
    { key: "high", label: "\u9AD8\u4E2D" },
    { key: "college", label: "\u5927\u5B66" },
    { key: "graduate", label: "\u7814\u7A76\u751F" }
  ];

  // src/client/values.js
  var isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
  var obj = (v) => isObj(v) ? v : {};
  var arr = (v) => Array.isArray(v) ? v : [];
  var num = (v, dflt) => typeof v === "number" && isFinite(v) ? v : dflt;
  var str = (v, dflt) => typeof v === "string" && v !== "" ? v : dflt;

  // src/client/dom.js
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== void 0) node.textContent = text;
    return node;
  }
  function button(className, attrs, onClick) {
    var node = el("button", className);
    node.type = "button";
    for (var key in attrs) node.setAttribute(key, attrs[key]);
    node.addEventListener("click", function(event) {
      event.stopPropagation();
      onClick();
    });
    return node;
  }
  function meter(value, variant) {
    var wrap = el("div", "dp-meter" + (variant ? " " + variant : ""));
    var fill = document.createElement("i");
    fill.style.width = Math.max(0, Math.min(100, num(value, 0))) + "%";
    wrap.appendChild(fill);
    return wrap;
  }

  // src/client/widgets.js
  function labelledBar(ui, label, value, valueText, variant) {
    var row = el("div", "dp-row");
    row.appendChild(el("span", null, label));
    row.appendChild(el("b", null, valueText));
    ui.content.appendChild(row);
    ui.content.appendChild(meter(value, variant));
  }
  function pickerPanel(ui, action) {
    var wrap = el("div", "dp-pick");
    var asks = { feed: "\u5582\u70B9\u4EC0\u4E48\uFF1F", bathe: "\u7528\u54EA\u4E2A\u6D17\u6FA1\uFF1F", play: "\u62FF\u54EA\u4E2A\u73A9\u5177\uFF1F" };
    wrap.appendChild(el("div", "dp-pick-head", asks[action] ?? "\u7528\u54EA\u4E2A\uFF1F"));
    var list = el("div", "dp-list");
    var shelf = ui.view.care[action] ?? [];
    for (var i = 0; i < shelf.length; i += 1) {
      (function(item) {
        var row = el("div", "dp-item");
        row.appendChild(el("span", null, item.emoji));
        var grow = el("div", "dp-grow");
        grow.appendChild(el("div", null, item.label + (item.default ? "\uFF08\u81EA\u5E26\uFF09" : " \xD7" + num(item.count, 0))));
        grow.appendChild(el("div", "dp-dim", careEffectLine(action, item)));
        row.appendChild(grow);
        var use = button("dp-mini", { "data-care": action + ":" + item.key }, function() {
          ui.picker = null;
          ui.send(action, { item: item.key });
        });
        use.textContent = "\u7528";
        row.appendChild(use);
        list.appendChild(row);
      })(shelf[i]);
    }
    wrap.appendChild(list);
    var cancel = button("dp-cancel", {}, function() {
      ui.picker = null;
      ui.renderContent();
    });
    cancel.textContent = "\u7B97\u4E86";
    wrap.appendChild(cancel);
    return wrap;
  }
  function careEffectLine(action, item) {
    var parts = [];
    if (action === "feed") {
      parts.push("\u9971\u98DF +" + item.satiety);
      if (item.happiness) parts.push("\u5FC3\u60C5 +" + item.happiness);
    } else if (action === "bathe") {
      parts.push("\u6E05\u6D01 +" + item.cleanliness);
      if (item.happiness) parts.push("\u5FC3\u60C5 +" + item.happiness);
    } else {
      parts.push("\u5FC3\u60C5 +" + item.happiness);
      if (item.satiety) parts.push("\u9971\u98DF " + item.satiety);
    }
    return parts.join(" \xB7 ");
  }
  function tileGrid() {
    return el("div", "dp-tiles");
  }
  function tile(spec) {
    var node = button("dp-tile" + (spec.soft ? " dp-tile-soft" : ""), spec.data ?? {}, function() {
      spec.onPick();
    });
    node.setAttribute("data-color", spec.color);
    if (spec.locked) node.setAttribute("data-locked", "true");
    if (spec.dim) node.setAttribute("data-dim", "true");
    if (spec.active) node.setAttribute("data-active", "true");
    if (spec.disabled === true) node.disabled = true;
    var icon = el("span", "dp-tile-icon");
    icon.appendChild(el("span", "dp-tile-e", spec.emoji));
    if (spec.badge) icon.appendChild(el("b", "dp-tile-badge", spec.badge));
    if (spec.tag) icon.appendChild(el("b", "dp-tile-tag", spec.tag));
    node.appendChild(icon);
    node.appendChild(el("span", "dp-tile-n", spec.label));
    if (spec.note) node.appendChild(el("span", "dp-tile-note", spec.note));
    return node;
  }
  function drillTo(ui, tab, key) {
    ui.drill[tab] = key;
    ui.drill.pick = null;
    ui.renderContent();
    ui.content.scrollTop = 0;
  }
  function drillHeader(ui, tab, title, info) {
    var row = el("div", "dp-drill");
    var back = button("dp-drill-back", { "data-back": tab }, function() {
      drillTo(ui, tab, null);
    });
    back.textContent = "\u2039";
    row.appendChild(back);
    row.appendChild(el("b", "dp-drill-title", title));
    if (info) row.appendChild(el("span", "dp-drill-info", info));
    ui.content.appendChild(row);
  }

  // src/client/tabs/shop.js
  var SHELF_COLOR = { food: "red", bath: "teal", toy: "yellow", dress: "pink", medicine: "green", revive: "purple", contract: "blue" };
  function shelfParts(kind) {
    var title = KIND_TITLE[kind] ?? kind;
    var space = title.indexOf(" ");
    return space < 0 ? ["\u{1F6D2}", title] : [title.slice(0, space), title.slice(space + 1)];
  }
  function renderShopTab(ui) {
    if (ui.view.shop.length === 0) {
      ui.content.appendChild(el("div", "dp-empty", "\u5BBF\u4E3B\u8FD8\u6CA1\u63D0\u4F9B\u8D27\u67B6\u3002"));
      return;
    }
    var coins = "\u{1FA99} " + ui.view.pig.coins;
    var shelf = ui.drill.shop;
    if (shelf === null || KIND_ORDER.indexOf(shelf) < 0) {
      renderShelves(ui);
      return;
    }
    var parts = shelfParts(shelf);
    drillHeader(ui, "shop", parts[0] + " " + parts[1], coins);
    var grid = tileGrid();
    var items = ui.view.shop.filter(function(item) {
      return item.kind === shelf;
    });
    for (var i = 0; i < items.length; i += 1) grid.appendChild(itemTile(ui, items[i], SHELF_COLOR[shelf]));
    ui.content.appendChild(grid);
  }
  function renderShelves(ui) {
    var grid = tileGrid();
    for (var k = 0; k < KIND_ORDER.length; k += 1) {
      (function(kind) {
        var items = ui.view.shop.filter(function(item) {
          return item.kind === kind;
        });
        if (items.length === 0) return;
        var parts = shelfParts(kind);
        var needed = items.some(function(item) {
          return item.needed;
        });
        grid.appendChild(tile({
          emoji: parts[0],
          label: parts[1],
          color: SHELF_COLOR[kind] ?? "blue",
          tag: needed ? "\u9700\u8981" : "",
          data: { "data-shelf": kind },
          onPick: function() {
            drillTo(ui, "shop", kind);
          }
        }));
      })(KIND_ORDER[k]);
    }
    ui.content.appendChild(grid);
  }
  function itemTile(ui, item, color) {
    var owned = num(ui.view.inventory[item.key], 0);
    var note = item.price + " \u{1FA99}";
    if (item.owned) note = "\u5DF2\u62E5\u6709";
    else if (item.kind === "dress" && item.unlocked === false) note = "\u{1F512} Lv." + item.level;
    return tile({
      emoji: item.emoji,
      label: item.label,
      color,
      soft: true,
      note,
      badge: owned > 0 ? "\xD7" + owned : "",
      tag: item.needed ? "\u9700\u8981" : item.owned && item.worn ? "\u7A7F\u7740" : "",
      dim: !item.owned && (!item.affordable || item.kind === "dress" && item.unlocked === false),
      disabled: item.owned === true,
      data: { "data-buy": item.key },
      onPick: function() {
        ui.send("buy", { item: item.key });
      }
    });
  }

  // src/client/tabs/bag.js
  var CONSUMABLES = KIND_ORDER.filter(function(kind) {
    return kind !== "dress";
  });
  var EXTRA = {
    dress: { emoji: "\u{1F455}", label: "\u88C5\u626E", color: "pink" },
    diary: { emoji: "\u{1F4D4}", label: "\u65E5\u8BB0", color: "brown" },
    souvenir: { emoji: "\u{1F381}", label: "\u7EAA\u5FF5\u54C1", color: "blue" }
  };
  function shortDay(day) {
    return day.length >= 10 ? day.slice(5) : day;
  }
  function renderBagTab(ui) {
    var open = ui.drill.bag;
    if (open === "dress") renderDress(ui);
    else if (open === "diary") renderDiary(ui);
    else if (open === "souvenir") renderSouvenirs(ui);
    else if (open !== null && CONSUMABLES.indexOf(open) >= 0) renderItems(ui, open);
    else renderCategories(ui);
  }
  function ownedOf(ui, kind) {
    return ui.view.shop.filter(function(item) {
      return item.kind === kind && num(ui.view.inventory[item.key], 0) > 0;
    });
  }
  function renderCategories(ui) {
    var grid = tileGrid();
    for (var k = 0; k < CONSUMABLES.length; k += 1) {
      (function(kind) {
        var items = ownedOf(ui, kind);
        var count = items.reduce(function(sum, item) {
          return sum + num(ui.view.inventory[item.key], 0);
        }, 0);
        var parts = shelfParts(kind);
        grid.appendChild(tile({
          emoji: parts[0],
          label: parts[1],
          color: SHELF_COLOR[kind] ?? "blue",
          badge: count > 0 ? String(count) : "",
          dim: count === 0,
          tag: items.some(function(item) {
            return item.needed;
          }) ? "\u9700\u8981" : "",
          data: { "data-bag": kind },
          onPick: function() {
            drillTo(ui, "bag", kind);
          }
        }));
      })(CONSUMABLES[k]);
    }
    var counts = {
      dress: ui.view.dress.filter(function(item) {
        return item.owned;
      }).length,
      diary: ui.view.diary.length,
      souvenir: ui.view.pig.souvenirs.length
    };
    for (var key in EXTRA) {
      (function(category) {
        var spec = EXTRA[category];
        grid.appendChild(tile({
          emoji: spec.emoji,
          label: spec.label,
          color: spec.color,
          badge: counts[category] > 0 ? String(counts[category]) : "",
          dim: counts[category] === 0,
          data: { "data-bag": category },
          onPick: function() {
            drillTo(ui, "bag", category);
          }
        }));
      })(key);
    }
    ui.content.appendChild(grid);
  }
  function renderItems(ui, kind) {
    var parts = shelfParts(kind);
    drillHeader(ui, "bag", parts[0] + " " + parts[1], "\u70B9\u4E00\u4E0B\u5C31\u7528");
    var items = ownedOf(ui, kind);
    if (items.length === 0) {
      ui.content.appendChild(el("div", "dp-empty", "\u7A7A\u7684"));
      return;
    }
    var grid = tileGrid();
    for (var i = 0; i < items.length; i += 1) {
      (function(item) {
        grid.appendChild(tile({
          emoji: item.emoji,
          label: item.label,
          color: SHELF_COLOR[kind] ?? "blue",
          soft: true,
          badge: "\xD7" + num(ui.view.inventory[item.key], 0),
          tag: item.needed ? "\u9700\u8981" : "",
          // 契约 is the one consumable whose conditions you need to see before spending it.
          note: item.kind === "contract" ? item.blurb : "",
          data: { "data-use": item.key },
          onPick: function() {
            ui.send("use", { item: item.key });
          }
        }));
      })(items[i]);
    }
    ui.content.appendChild(grid);
  }
  function renderDress(ui) {
    var owned = ui.view.dress.filter(function(item) {
      return item.owned;
    });
    var worn = owned.filter(function(item) {
      return item.worn;
    }).length;
    drillHeader(ui, "bag", "\u{1F455} \u88C5\u626E", worn + " \u4EF6\u7A7F\u7740");
    if (owned.length === 0) {
      ui.content.appendChild(el("div", "dp-empty", "\u8FD8\u6CA1\u6709\u88C5\u626E"));
      return;
    }
    var grid = tileGrid();
    for (var i = 0; i < owned.length; i += 1) {
      (function(item) {
        grid.appendChild(tile({
          emoji: item.emoji,
          label: item.label,
          color: EXTRA.dress.color,
          soft: true,
          note: item.slotLabel,
          tag: item.worn ? "\u7A7F\u7740" : "",
          active: item.worn,
          data: { "data-wear": item.key },
          onPick: function() {
            ui.send("wear", { item: item.key, on: !item.worn });
          }
        }));
      })(owned[i]);
    }
    ui.content.appendChild(grid);
  }
  function renderDiary(ui) {
    drillHeader(ui, "bag", "\u{1F4D4} \u65E5\u8BB0", ui.view.diary.length + " \u7BC7");
    if (ui.view.diary.length === 0) {
      ui.content.appendChild(el("div", "dp-empty", "\u8FD8\u6CA1\u6709\u65E5\u8BB0"));
      return;
    }
    var grid = tileGrid();
    var picked = null;
    for (var d = 0; d < ui.view.diary.length; d += 1) {
      (function(entry) {
        var active = ui.drill.pick === entry.day;
        if (active) picked = entry;
        grid.appendChild(tile({
          emoji: "\u{1F4D4}",
          label: shortDay(entry.day),
          color: EXTRA.diary.color,
          soft: true,
          active,
          data: { "data-diary": entry.day },
          onPick: function() {
            ui.drill.pick = active ? null : entry.day;
            ui.renderContent();
          }
        }));
      })(ui.view.diary[d]);
    }
    ui.content.appendChild(grid);
    if (picked !== null) {
      var page = el("div", "dp-pick dp-tile-card dp-diary-page");
      page.appendChild(el("div", "dp-pick-head", picked.day));
      page.appendChild(el("div", null, picked.text));
      ui.content.appendChild(page);
    }
  }
  function renderSouvenirs(ui) {
    var list = ui.view.pig.souvenirs;
    drillHeader(ui, "bag", "\u{1F381} \u7EAA\u5FF5\u54C1", list.length + " \u4EF6");
    if (list.length === 0) {
      ui.content.appendChild(el("div", "dp-empty", "\u6536\u85CF\u518C\u8FD8\u7A7A\u7740"));
      return;
    }
    var grid = tileGrid();
    var picked = null;
    for (var s = 0; s < list.length; s += 1) {
      (function(entry, index) {
        var id = entry.key + "#" + index;
        var active = ui.drill.pick === id;
        if (active) picked = entry;
        grid.appendChild(tile({
          emoji: entry.emoji,
          label: entry.label,
          color: EXTRA.souvenir.color,
          soft: true,
          active,
          note: entry.rarityEmoji + entry.rarityLabel,
          data: { "data-souvenir": id },
          onPick: function() {
            ui.drill.pick = active ? null : id;
            ui.renderContent();
          }
        }));
      })(list[s], s);
    }
    ui.content.appendChild(grid);
    if (picked === null) return;
    var story = el("div", "dp-pick dp-tile-card");
    story.appendChild(el("div", "dp-pick-head", picked.emoji + " " + picked.label + (picked.fromLabel === "" ? "" : " \xB7 " + picked.fromLabel)));
    story.appendChild(el("div", null, picked.story === "" ? "\uFF08\u65E7\u7248\u672C\u5E26\u56DE\u6765\u7684\uFF0C\u6CA1\u6709\u6545\u4E8B\uFF09" : "\u300C" + picked.story + "\u300D"));
    if (picked.price > 0) {
      var sold = picked;
      var sell = button("dp-mini", { "data-sell": sold.key }, function() {
        ui.drill.pick = null;
        ui.send("sell", { souvenir: sold.key });
      });
      sell.textContent = "\u5356\u6389 +" + sold.price + " \u{1FA99}";
      sell.style.marginTop = "6px";
      story.appendChild(sell);
    }
    ui.content.appendChild(story);
  }

  // src/client/tabs/dev.js
  function renderDevTab(ui) {
    ui.content.appendChild(el("div", "dp-dev-note", "\u{1F527} \u5F00\u53D1\u8005\u6A21\u5F0F \xB7 \u6784\u5EFA v" + (ui.view.version === "" ? "\u672A\u77E5" : ui.view.version) + " \xB7 Ctrl+Shift+D \u5173\u95ED"));
    if (ui.view.pig !== null && ui.view.pig.ageForced) {
      ui.content.appendChild(el(
        "div",
        "dp-dev-note",
        "\u26A0\uFE0F \u5E74\u9F84\u662F\u8C03\u8BD5\u6539\u7684\uFF08HUD \u4E0A\u6709 \u{1F527}\uFF09\u2014\u2014 \u6309\u300C\u23EA \u5E74\u9F84\u5F52\u96F6\u300D\u624D\u4F1A\u91CD\u65B0\u6309\u771F\u5B9E\u65F6\u95F4\u7B97"
      ));
    }
    var p = ui.view.pig;
    if (p === null) {
      ui.content.appendChild(el("div", "dp-empty", "\u8FD8\u6CA1\u6709\u732A\u3002\u5148\u300C\u62C6\u5F00\u7EB8\u76D2\u300D\u518D\u8C03\u3002"));
      return;
    }
    function group(title, entries) {
      var head = el("div", "dp-title");
      head.appendChild(el("b", null, title));
      ui.content.appendChild(head);
      var wrap = el("div", "dp-dev-row");
      for (var i = 0; i < entries.length; i += 1) {
        (function(entry) {
          var btn = button("dp-mini dp-dev-btn", { "data-dev": entry.key }, function() {
            entry.run();
          });
          btn.textContent = entry.label;
          wrap.appendChild(btn);
        })(entries[i]);
      }
      ui.content.appendChild(wrap);
    }
    var patch = function(body) {
      ui.send("dev", { patch: body });
    };
    group("\u72B6\u6001", [
      { key: "full", label: "\u{1F60A} \u6EE1\u72B6\u6001", run: function() {
        patch({ satiety: 100, happiness: 100, cleanliness: 100, health: 5 });
      } },
      { key: "hungry", label: "\u{1F34E} \u997F", run: function() {
        patch({ satiety: 10 });
      } },
      { key: "dirty", label: "\u{1FAE7} \u810F", run: function() {
        patch({ cleanliness: 10 });
      } },
      { key: "lonely", label: "\u{1F97A} \u5B64\u5355", run: function() {
        patch({ happiness: 10 });
      } },
      { key: "sleepy", label: "\u{1F4A4} \u56F0", run: function() {
        patch({ satiety: 90, happiness: 90, cleanliness: 90 });
      } }
    ]);
    group("\u751F\u75C5", [
      { key: "cold1", label: "\u{1F927} \u611F\u5192", run: function() {
        patch({ illness: { chain: 0, stage: 1 }, health: 4 });
      } },
      { key: "cough1", label: "\u{1F637} \u54B3\u55FD", run: function() {
        patch({ illness: { chain: 1, stage: 1 }, health: 4 });
      } },
      { key: "belly1", label: "\u{1F922} \u809A\u5B50\u80C0", run: function() {
        patch({ illness: { chain: 2, stage: 1 }, health: 4 });
      } },
      { key: "dizzy1", label: "\u{1F635} \u5934\u6655", run: function() {
        patch({ illness: { chain: 3, stage: 1 }, health: 4 });
      } },
      { key: "skin1", label: "\u{1FA79} \u7619\u75D2", run: function() {
        patch({ illness: { chain: 4, stage: 1 }, health: 4 });
      } },
      { key: "cold4", label: "\u2620\uFE0F \u80BA\u708E", run: function() {
        patch({ illness: { chain: 0, stage: 4 }, health: 1 });
      } },
      { key: "cure", label: "\u{1F49A} \u6CBB\u597D", run: function() {
        patch({ illness: null, health: 5 });
      } }
    ]);
    group("\u7B49\u7EA7", [
      { key: "box", label: "\u{1F4E6} \u7EB8\u76D2", run: function() {
        patch({ hatched: false });
      } },
      { key: "lv1", label: "\u5E7C\u5E74 Lv1", run: function() {
        patch({ hatched: true, level: 1 });
      } },
      { key: "lv10", label: "\u9752\u5E74 Lv10", run: function() {
        patch({ level: 10 });
      } },
      { key: "lv40", label: "\u6210\u5E74 Lv40", run: function() {
        patch({ level: 40 });
      } },
      { key: "lv60", label: "\u6EE1\u7EA7 Lv60", run: function() {
        patch({ level: 60 });
      } },
      { key: "real", label: "\u23EA \u5929\u6570\u5F52\u96F6", run: function() {
        ui.send("ageFromNow");
      } }
    ]);
    group("\u8D44\u6E90", [
      { key: "coin100", label: "\u{1FA99} +100", run: function() {
        patch({ coins: p.coins + 100 });
      } },
      { key: "coin999", label: "\u{1FA99} 9999", run: function() {
        patch({ coins: 9999 });
      } },
      { key: "traits", label: "\u{1F9E0}+5 \u2728+5 \u{1F4AA}+5", run: function() {
        patch({ traits: { intel: 5, charm: 5, strong: 5 } });
      } },
      { key: "all", label: "\u{1F381} \u4E00\u952E\u62FF\u9F50", run: function() {
        ui.send("giveAll");
      } }
    ]);
    group("\u65F6\u95F4", [
      { key: "real", label: "\xD71 \u771F\u5B9E", run: function() {
        ui.send("timeScale", { scale: 1 });
      } },
      { key: "fast12", label: "\xD712", run: function() {
        ui.send("timeScale", { scale: 12 });
      } },
      { key: "fast30", label: "\xD730", run: function() {
        ui.send("timeScale", { scale: 30 });
      } },
      { key: "fast60", label: "\xD760", run: function() {
        ui.send("timeScale", { scale: 60 });
      } }
    ]);
    group("\u751F\u6B7B", [
      { key: "kill", label: "\u{1F480} \u5F04\u6B7B", run: function() {
        patch({ dead: true });
      } },
      { key: "revive", label: "\u2728 \u590D\u6D3B", run: function() {
        patch({ dead: false, health: 5 });
      } },
      { key: "adopt", label: "\u{1F4E6} \u9886\u517B", run: function() {
        ui.send("adopt");
      } },
      { key: "reset", label: "\u{1F504} \u91CD\u7F6E", run: function() {
        ui.send("reset");
      } }
    ]);
    group("\u9762\u677F", [
      { key: "open", label: "\u5C55\u5F00/\u6536\u8D77", run: function() {
        ui.setOpen(ui.host.getAttribute("data-open") !== "true");
      } },
      { key: "away1", label: "\u23E9 +1 \u5C0F\u65F6", run: function() {
        patch({ __advanceMs: 36e5 });
      } },
      { key: "away24", label: "\u23E9 +1 \u5929", run: function() {
        patch({ __advanceMs: 864e5 });
      } }
    ]);
    ui.content.appendChild(el(
      "div",
      "dp-dev-note",
      "\u5F53\u524D\uFF1A" + p.stage.label + " \xB7 \u5065\u5EB7 " + p.health + " \xB7 \u{1FA99} " + p.coins + (p.illness === null ? "" : " \xB7 " + p.illness.name)
    ));
  }

  // src/client/tabs/status.js
  function renderStatusTab(ui) {
    var p = ui.view.pig;
    if (p === null) return;
    renderBanners(ui);
    labelledBar(ui, "\u{1F35A} \u9971\u98DF", p.satiety, p.satiety + "%");
    labelledBar(ui, "\u2764\uFE0F \u5FC3\u60C5", p.happiness, p.happiness + "%", "dp-mood");
    labelledBar(ui, "\u{1FAE7} \u6E05\u6D01", p.cleanliness, p.cleanliness + "%", "dp-clean");
    labelledBar(ui, "\u{1F49A} \u5065\u5EB7", p.healthPercent, p.health + "/" + ui.view.maxHealth, "dp-health");
    var traits = el("div", "dp-traits");
    traits.appendChild(el("span", null, "\u{1F9E0} \u667A\u529B " + p.traits.intel));
    traits.appendChild(el("span", null, "\u2728 \u9B45\u529B " + p.traits.charm));
    traits.appendChild(el("span", null, "\u{1F4AA} \u6B66\u529B " + p.traits.strong));
    ui.content.appendChild(traits);
    var info = el("div", "dp-row");
    info.appendChild(el("span", null, "\u2696\uFE0F \u4F53\u91CD " + p.weight));
    info.appendChild(el("b", null, "\u{1FA99} " + p.coins));
    ui.content.appendChild(info);
    var daily = ui.view.daily;
    var dailyLine = el("div", "dp-row");
    dailyLine.appendChild(el("span", null, "\u{1F4C5} \u7B7E\u5230"));
    dailyLine.appendChild(el("b", null, "\u7B2C " + daily.signInDay + "/" + daily.cycle + " \u5929" + (daily.canSignIn ? " \xB7 \u4ECA\u5929\u8FD8\u6CA1\u7B7E" : "") + (daily.unclaimed > 0 ? " \xB7 \u{1F381} " + daily.unclaimed : "")));
    ui.content.appendChild(dailyLine);
    var lvl = el("div", "dp-row");
    lvl.appendChild(el("span", null, "\u2B50 \u7B49\u7EA7"));
    lvl.appendChild(el("b", null, "Lv." + p.level.level + " " + p.level.titleEmoji + p.level.titleLabel + (p.level.maxed ? " \xB7 \u6EE1\u7EA7" : " \xB7 \u8FD8\u5DEE " + Math.ceil(p.level.toNext) + " \u6210\u957F")));
    ui.content.appendChild(lvl);
    var age = el("div", "dp-row");
    age.appendChild(el("span", null, "\u{1F3E0} \u966A\u4F34"));
    age.appendChild(el("b", null, p.ageLabel + (p.ageForced ? " \u{1F527}" : "") + (p.daysToNextStage === null ? " \xB7 \u5DF2\u957F\u6210" : "")));
    ui.content.appendChild(age);
    var grid = el("div", "dp-actions");
    for (var i = 0; i < MODES.length; i += 1) {
      (function(key) {
        var info2 = ui.view.actions[key];
        var shelf = ui.view.care[key] ?? [];
        var needsItem = shelf.length > 0;
        var btn = button("dp-btn", { "data-action": key }, function() {
          if (needsItem) {
            ui.picker = ui.picker === key ? null : key;
            ui.renderContent();
          } else {
            ui.send(key);
          }
        });
        btn.setAttribute("data-open-picker", ui.picker === key ? "true" : "false");
        btn.appendChild(el("span", null, CARE_LABEL[key][1]));
        btn.appendChild(el("span", null, CARE_LABEL[key][0]));
        if (needsItem) btn.appendChild(el("span", "dp-count", String(shelf.length)));
        if (!info2.ready || ui.view.dead) {
          btn.disabled = true;
          if (ui.view.dead) btn.appendChild(el("span", "dp-wait", "\u2014"));
          else if (info2.waitSeconds > 0) btn.appendChild(el("span", "dp-wait", info2.waitSeconds + "s"));
          else if (info2.blocked === "away") btn.appendChild(el("span", "dp-wait", "\u4E0D\u5728\u5BB6"));
        }
        grid.appendChild(btn);
      })(MODES[i]);
    }
    ui.content.appendChild(grid);
    if (ui.picker !== null && (ui.view.care[ui.picker] ?? []).length > 0) ui.content.appendChild(pickerPanel(ui, ui.picker));
    ui.content.appendChild(talkRow(ui));
    if (p.memories.length > 0) {
      ui.content.appendChild(el("div", "dp-memo", p.memories.slice(-3).join("\n")));
    }
  }
  function talkRow(ui) {
    var row = el("div", "dp-row dp-talk");
    if (ui.ownerEdit !== null || ui.pigNameEdit !== null) {
      var forPig = ui.pigNameEdit !== null;
      var input = (
        /** @type {HTMLInputElement} */
        el("input", "dp-input")
      );
      input.value = forPig ? ui.pigNameEdit : ui.ownerEdit;
      input.maxLength = 16;
      input.setAttribute(forPig ? "data-pig-input" : "data-owner-input", "true");
      input.addEventListener("input", function() {
        if (forPig) ui.pigNameEdit = input.value;
        else ui.ownerEdit = input.value;
      });
      var save = button("dp-mini", { "data-name-save": forPig ? "pig" : "owner" }, function() {
        var name = ((forPig ? ui.pigNameEdit : ui.ownerEdit) || "").trim();
        if (forPig) ui.pigNameEdit = null;
        else ui.ownerEdit = null;
        if (name !== "") ui.send(forPig ? "name" : "owner", { name });
        ui.renderContent();
      });
      save.textContent = "\u597D";
      var cancel = button("dp-mini dp-mini-plain", { "data-name-cancel": "true" }, function() {
        ui.ownerEdit = null;
        ui.pigNameEdit = null;
        ui.renderContent();
      });
      cancel.textContent = "\u7B97\u4E86";
      row.appendChild(input);
      row.appendChild(save);
      row.appendChild(cancel);
      return row;
    }
    var renameOwner = button("dp-mini dp-mini-plain", { "data-owner-edit": "true" }, function() {
      ui.ownerEdit = ui.view.dialogue.ownerName;
      ui.renderContent();
    });
    renameOwner.textContent = "\u270F\uFE0F \u79F0\u547C";
    renameOwner.title = "\u73B0\u5728\u53EB\u300C" + ui.view.dialogue.ownerName + "\u300D";
    var renamePig = button("dp-mini dp-mini-plain", { "data-pig-edit": "true" }, function() {
      ui.pigNameEdit = ui.view.pig === null ? "" : ui.view.pig.name;
      ui.renderContent();
    });
    renamePig.textContent = "\u270F\uFE0F \u540D\u5B57";
    renamePig.title = ui.view.pig === null ? "\u732A\u8FD8\u6CA1\u6765" : "\u73B0\u5728\u53EB\u300C" + ui.view.pig.name + "\u300D";
    var quiet = button("dp-mini dp-mini-plain", { "data-quiet": ui.view.dialogue.quiet ? "on" : "off" }, function() {
      ui.send("quiet", { on: !ui.view.dialogue.quiet });
    });
    quiet.textContent = ui.view.dialogue.quiet ? "\u{1F515} \u514D\u6253\u6270\u4E2D" : "\u{1F514} \u514D\u6253\u6270";
    row.appendChild(renameOwner);
    row.appendChild(renamePig);
    row.appendChild(quiet);
    return row;
  }
  function renderBanners(ui) {
    if (ui.view.pig !== null && ui.view.dead) {
      var dead = el("div", "dp-alert dp-dead");
      dead.appendChild(el("b", null, "\u{1FAA6} " + ui.view.pig.name + " \u8D70\u4E86" + (ui.view.pig.soul ? "\uFF0C\u7075\u9B42\u8FD8\u7559\u5728\u5893\u7891\u4E0A \u{1F47B}" : "")));
      dead.appendChild(el("div", null, ui.view.pig.soul ? "\u7528\u8FD8\u9B42\u4E39\u53EF\u4EE5\u628A\u5B83\u53EB\u56DE\u6765\uFF0C\u4E5F\u53EF\u4EE5\u9886\u517B\u65B0\u7684" : "\u80CC\u5305\u91CC\u7684\u8FD8\u9B42\u4E39\u5C31\u80FD\u6551\u56DE\u6765"));
      ui.content.appendChild(dead);
      var adoptWrap = el("div", "dp-actions");
      var adopt = button("dp-btn dp-btn-wide", { "data-action": "adopt" }, function() {
        ui.send("adopt");
      });
      adopt.appendChild(el("span", null, "\u{1F4E6}"));
      adopt.appendChild(el("span", null, "\u9886\u517B\u65B0\u732A"));
      adoptWrap.appendChild(adopt);
      ui.content.appendChild(adoptWrap);
    } else if (ui.view.pig !== null && ui.view.pig.illness !== null) {
      var illness = ui.view.pig.illness;
      var sick = el("div", "dp-alert dp-sick");
      sick.appendChild(el("b", null, "\u{1F912} " + illness.name + "\uFF08\u7B2C " + illness.stage + "/4 \u671F\uFF09"));
      sick.appendChild(el("div", null, "\u9700\u8981\u300C" + illness.cureEmoji + illness.cure + "\u300D\u2014\u2014 \u5403\u9519\u836F\u4F1A\u52A0\u91CD"));
      var needed = null;
      var shelf = ui.view.shop || [];
      for (var c = 0; c < shelf.length; c += 1) {
        if (shelf[c].needed) needed = shelf[c];
      }
      for (var t = 0; needed === null && t < shelf.length; t += 1) {
        if (shelf[t].kind === "medicine" && shelf[t].tier === illness.stage) needed = shelf[t];
      }
      for (var n = 0; needed === null && n < shelf.length; n += 1) {
        if (shelf[n].label === illness.cure) needed = shelf[n];
      }
      if (ui.view.canGoOut) {
        sick.appendChild(el("div", "dp-dim", "\u5E26\u75C5\u51FA\u95E8\u62A5\u916C\u51CF\u534A\u3001\u75C5\u60C5\u66F4\u5FEB"));
      }
      if (needed !== null && ui.view.canGoOut && ui.view.pig.coins < needed.price) {
        sick.appendChild(el("div", "dp-dim", "\u8FD8\u5DEE " + needed.price + " \u{1FA99} \u4E70\u300C" + needed.label + "\u300D\uFF0C\u5148\u53BB\u6253\u5DE5"));
      }
      ui.content.appendChild(sick);
      if (illness.doctorFee !== null) {
        var clinic = el("div", "dp-actions");
        var doctor = button("dp-btn dp-btn-wide", { "data-action": "doctor" }, function() {
          ui.send("doctor");
        });
        doctor.appendChild(el("span", null, "\u{1F3E5}"));
        doctor.appendChild(el("span", null, "\u770B\u533B\u751F\uFF08" + illness.doctorFee + " \u{1FA99}\uFF09"));
        clinic.appendChild(doctor);
        ui.content.appendChild(clinic);
      }
    } else if (ui.view.pig !== null && ui.view.activity !== null) {
      var away = el("div", "dp-alert dp-work");
      away.appendChild(el("b", null, ui.view.activity.emoji + " \u5728\u5916\u9762\uFF1A" + ui.view.activity.label));
      away.appendChild(el("div", null, "\u8FD8\u6709 " + ui.view.activity.secondsLeft + " \u79D2"));
      ui.content.appendChild(away);
      var wrap = el("div", "dp-actions");
      var call = button("dp-btn dp-btn-wide", { "data-action": "calloff" }, function() {
        ui.send("calloff");
      });
      call.appendChild(el("span", null, "\u21A9\uFE0F"));
      call.appendChild(el("span", null, "\u53EB\u5B83\u56DE\u6765"));
      wrap.appendChild(call);
      ui.content.appendChild(wrap);
    }
  }

  // src/client/tabs/study.js
  var INTEREST_TAB = "interest";
  var STAGE_COLOR = { primary: "yellow", middle: "teal", college: "blue", graduate: "purple", beyond: "pink" };
  var INTEREST_COLOR = "orange";
  var FALLBACK_COLORS = ["yellow", "teal", "blue", "purple", "pink", "green", "lime"];
  function standing(sub, stage) {
    if (stage === null || sub.stageKey === "") return "current";
    if (sub.stageKey === stage.key) return "current";
    if (stage.upTo !== null && sub.lessons >= stage.upTo) return "done";
    return "ahead";
  }
  function renderStudyTab(ui) {
    if (ui.view.subjects.length === 0) {
      ui.content.appendChild(el("div", "dp-empty", "\u5BBF\u4E3B\u8FD8\u6CA1\u63D0\u4F9B\u8BFE\u7A0B\u8868\u3002"));
      return;
    }
    var open = ui.drill.study;
    if (open === INTEREST_TAB && ui.view.interests.length > 0) {
      renderInterests(ui);
      return;
    }
    var stage = null;
    for (var d = 0; d < ui.view.stages.length; d += 1) if (ui.view.stages[d].key === open) stage = ui.view.stages[d];
    if (stage === null) {
      renderStages(ui);
      return;
    }
    renderSubjects(ui, stage);
  }
  function renderStages(ui) {
    var stageList = ui.view.stages.length > 0 ? ui.view.stages : STAGES;
    var grid = tileGrid();
    for (var s = 0; s < stageList.length; s += 1) {
      (function(entry, index) {
        var locked = entry.unlocked === false;
        var finished = entry.upTo === null || entry.upTo === void 0 ? 0 : ui.view.subjects.filter(function(sub) {
          return sub.lessons >= entry.upTo;
        }).length;
        grid.appendChild(tile({
          emoji: entry.emoji || "\u{1F4DA}",
          label: entry.label,
          color: STAGE_COLOR[entry.key] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
          locked,
          tag: locked ? "\u{1F512}" : "",
          badge: finished > 0 ? "\u2713" + finished : "",
          data: { "data-stage": entry.key },
          onPick: function() {
            drillTo(ui, "study", entry.key);
          }
        }));
      })(stageList[s], s);
    }
    if (ui.view.interests.length > 0) {
      var certified = ui.view.interests.filter(function(entry) {
        return entry.certified;
      }).length;
      grid.appendChild(tile({
        emoji: "\u{1F3AF}",
        label: "\u5174\u8DA3",
        color: INTEREST_COLOR,
        badge: certified > 0 ? "\u{1F4DC}" + certified : "",
        data: { "data-stage": INTEREST_TAB },
        onPick: function() {
          drillTo(ui, "study", INTEREST_TAB);
        }
      }));
    }
    ui.content.appendChild(grid);
  }
  function renderSubjects(ui, stage) {
    drillHeader(
      ui,
      "study",
      stage.emoji + " " + stage.label,
      stage.minutes + " \u5206\u949F \xB7 " + stage.tuition + " \u{1FA99} \xB7 +" + stage.gain
    );
    var color = STAGE_COLOR[stage.key] ?? FALLBACK_COLORS[Math.max(0, ui.view.stages.indexOf(stage)) % FALLBACK_COLORS.length];
    var grid = tileGrid();
    for (var i = 0; i < ui.view.subjects.length; i += 1) {
      (function(sub) {
        var where = standing(sub, stage);
        var note;
        if (where === "done") note = "\u2713 \u6BD5\u4E1A";
        else if (where === "ahead") note = "\u{1F512} " + (sub.stageLabel || "\u6CA1\u5230");
        else if (stage.upTo !== null) note = sub.lessons - stage.from + "/" + (stage.upTo - stage.from) + " \u8282";
        else note = sub.lessons + " \u8282";
        grid.appendChild(tile({
          emoji: sub.emoji,
          label: sub.label,
          color,
          soft: true,
          note,
          disabled: where !== "current" || !ui.view.canGoOut,
          dim: where === "current" && !sub.affordable,
          data: { "data-subject": sub.key },
          onPick: function() {
            ui.send("study", { subject: sub.key });
          }
        }));
      })(ui.view.subjects[i]);
    }
    ui.content.appendChild(grid);
  }
  function renderInterests(ui) {
    var after = ui.view.interests[0].certificateAfter;
    drillHeader(ui, "study", "\u{1F3AF} \u5174\u8DA3", after > 0 ? "\u4E0A\u6EE1 " + after + " \u6B21\u62FF\u8BC1" : "");
    var grid = tileGrid();
    for (var n = 0; n < ui.view.interests.length; n += 1) {
      (function(entry) {
        var note = entry.certificate === "" ? entry.cost + " \u{1FA99}" : entry.certified ? "\u{1F4DC} \u6709\u8BC1" : "\u{1F4DC} " + entry.times + "/" + entry.certificateAfter;
        grid.appendChild(tile({
          emoji: entry.emoji,
          label: entry.label,
          color: INTEREST_COLOR,
          soft: true,
          note,
          disabled: !ui.view.canGoOut,
          dim: !entry.affordable,
          data: { "data-interest": entry.key },
          onPick: function() {
            ui.send("interest", { interest: entry.key });
          }
        }));
      })(ui.view.interests[n]);
    }
    ui.content.appendChild(grid);
  }

  // src/client/format.js
  function formatMinutes(minutes) {
    if (minutes < 60) return minutes + " \u5206\u949F";
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? hours + " \u5C0F\u65F6" : hours + " \u5C0F\u65F6" + rest + " \u5206";
  }

  // src/client/css-base.js
  var CSS_BASE = [
    // ---------------------------------------------------------------------
    // Animal Crossing design language, transcribed from
    // guokaigdg/animal-island-ui docs/design-system (design-tokens.md and the
    // standalone css-variables.md template).
    //
    // The tokens are declared on the widget root rather than :root: the host
    // page must not inherit them, and they must not be clobbered by it.
    //
    // The rules that shape everything below:
    //   · warm earth-brown text on cream parchment, never pure black or grey
    //   · 12px minimum radius; buttons and inputs are 50px pills
    //   · the thick 3D bottom shadow belongs to primary buttons only
    //   · cards carry a border, not an elevation shadow
    //   · motion is 0.15-0.35s on cubic-bezier(.4,0,.2,1)
    //   · focus rings are yellow or teal, never blue
    // ---------------------------------------------------------------------
    "[data-dsh-pig]{",
    '--ac-font:Nunito,"Noto Sans SC",-apple-system,"PingFang SC","Hiragino Sans GB",sans-serif;',
    "--ac-primary:#19c8b9;--ac-primary-hover:#3dd4c6;--ac-primary-active:#11a89b;",
    "--ac-primary-bg:#e6f9f6;",
    "--ac-text:#794f27;--ac-text-body:#725d42;--ac-text-2:#9f927d;--ac-text-muted:#8a7b66;",
    "--ac-text-disabled:#c4b89e;",
    "--ac-bg:#f8f8f0;--ac-bg-content:rgb(247,243,223);--ac-bg-input:#fffbe7;",
    "--ac-bg-disabled:#f0ece2;",
    "--ac-border:#c4b89e;--ac-border-light:#e5dcc6;--ac-border-hover:#a89878;",
    "--ac-radius-sm:12px;--ac-radius-card:20px;--ac-pill:50px;",
    "--ac-shadow-sm:0 2px 4px 0 rgba(61,52,40,.06);",
    "--ac-shadow:0 3px 10px 0 rgba(61,52,40,.1);",
    "--ac-shadow-lg:0 8px 24px 0 rgba(61,52,40,.16);",
    "--ac-inset:inset 0 2px 4px rgba(114,93,66,.15);",
    // sidebar tokens: the library uses these for the selected menu row, which
    // is exactly the role the icon bar plays here.
    "--ac-active:#b7c6e5;--ac-hover:#d6dff0;",
    "--ac-success:#6fba2c;--ac-warning:#f5c31c;--ac-error:#e05a5a;",
    "--ac-ease:cubic-bezier(.4,0,.2,1);",
    // One place to size the pig; the scene and the panel cap derive from it.
    "--pig-size:56px;--pig-gap-below:12px;--scene-open:132px;--panel-width:292px;",
    "position:fixed;right:18px;bottom:18px;z-index:2147483000;",
    "font-family:var(--ac-font);font-weight:500;letter-spacing:.01em;",
    "-webkit-user-select:none;user-select:none;touch-action:none;",
    // The wrapper spans a column wider and taller than what it paints (the
    // scene's padding, the gap above the panel). Without this it swallows
    // clicks aimed at the page underneath — which once looked like "sending a
    // message does nothing" while the whole stack was healthy.
    "pointer-events:none;",
    // The pig is the only in-flow child, so the wrapper's box is exactly the
    // pig's box and the panel can be parked anywhere around it without ever
    // nudging the pig. `fitPanel` places the panel.
    "display:block}",
    "[data-dsh-pig] *{box-sizing:border-box}",
    "[data-dsh-pig]>*{pointer-events:auto}",
    // `hidden` MUST win. The UA sheet's `[hidden]{display:none}` ties on
    // specificity with a single class, so any `.dp-x{display:grid|flex}` rule
    // below silently beats it and the element keeps rendering. That is exactly
    // how a collapsed panel ended up showing the icon bar and the hud while
    // every `el.hidden === true` assertion still passed.
    "[data-dsh-pig] .dp-card[hidden],[data-dsh-pig] .dp-bar[hidden],",
    "[data-dsh-pig] .dp-content[hidden],[data-dsh-pig] .dp-hud[hidden],",
    "[data-dsh-pig] .dp-bubble[hidden],[data-dsh-pig] .dp-scene[hidden],",
    "[data-dsh-pig] .dp-work[hidden],[data-dsh-pig] .dp-soul[hidden],",
    "[data-dsh-pig] .dp-poke-hint[hidden],[data-dsh-pig] .dp-daily[hidden],",
    "[data-dsh-pig] .dp-pig-img[hidden],[data-dsh-pig] .dp-pig-emoji[hidden]{display:none}",
    /* ---------- the panel: cream parchment, border not shadow ---------- */
    // Taken out of flow on purpose. In flow it would widen the wrapper, and a
    // wider wrapper moves the pig — the exact thing this layout exists to
    // prevent. Absolutely positioned, the wrapper's box stays the pig's box
    // and `fitPanel` can put the panel on whichever side has room.
    ".dp-card{position:absolute;right:0;bottom:calc(100% + 8px);width:var(--panel-width);",
    "border-radius:var(--ac-radius-card);overflow:hidden;",
    "display:flex;flex-direction:column;",
    "background:var(--ac-bg);border:2px solid var(--ac-border-light);",
    // 面板自己钉住基准字号与字体：不钉就会继承宿主页面的 16px，
    // 详情框那种「没写 font-size 的容器」就会比周围大一倍（用户反馈 #2）。
    "box-shadow:var(--ac-shadow-lg);color:var(--ac-text-body);font-family:var(--ac-font);font-size:11px}",
    /* ---------- the pig: never moved, never boxed ---------- */
    ".dp-scene{position:relative;height:var(--scene-open);background:none;cursor:grab;",
    "overflow:visible;display:flex;align-items:flex-end;justify-content:flex-end;",
    "padding:0 6px var(--pig-gap-below);width:max-content}",
    '.dp-scene[data-dragging="true"]{cursor:grabbing}',
    // Collapsed the scene is exactly the pig, so the wrapper paints nothing
    // extra to click through. Open it widens to the panel so the hud and the
    // speech bubble have somewhere to sit — the pig is right-aligned either
    // way, so widening costs it no movement.
    '[data-dsh-pig][data-open="true"] .dp-scene{width:var(--panel-width)}',
    // Collapsed the scene shrinks to just the pig. An explicit height rather
    // than `auto` keeps the pig's line box identical in both states, so
    // opening moves it by exactly zero pixels.
    '[data-dsh-pig][data-open="false"] .dp-scene{height:calc(var(--pig-size) + var(--pig-gap-below));',
    "cursor:pointer}",
    ".dp-pig{line-height:1;transform-origin:50% 85%;cursor:pointer;position:relative;",
    "filter:drop-shadow(0 4px 6px rgba(61,52,40,.28));animation:dp-bob 1.8s ease-in-out infinite}",
    // 装扮点位：猪身上固定的几个锚点，每个点位挂一件。
    // 以后换真立绘时，只改这里的偏移/尺寸，逻辑和存档都不用动。
    ".dp-dress{position:absolute;inset:0;pointer-events:none;z-index:3}",
    ".dp-slot{position:absolute;line-height:1;font-size:15px;transform:translate(-50%,-50%)}",
    '.dp-slot[data-slot="head"]{left:50%;top:2%}',
    '.dp-slot[data-slot="face"]{left:50%;top:32%}',
    '.dp-slot[data-slot="neck"]{left:50%;top:60%}',
    '.dp-slot[data-slot="body"]{left:50%;top:78%;font-size:19px}',
    '.dp-slot[data-slot="back"]{left:14%;top:42%;font-size:19px}',
    '.dp-slot[data-slot="feet"]{left:50%;top:99%}',
    '[data-dsh-pig][data-open="false"] .dp-pig{filter:drop-shadow(0 5px 9px rgba(61,52,40,.26))}',
    // A petting hand rather than an arrow. Drawn inline as an SVG data URI so
    // it needs no asset and can carry the palette's warm outline; the hotspot
    // sits in the palm, which is where a pat actually lands. The `pointer`
    // after it is the fallback for browsers that refuse a custom cursor.
    `.dp-pig{cursor:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><g fill="%23F7C9B6" stroke="%23794F27" stroke-width="1.7" stroke-linejoin="round"><rect x="10" y="13.5" width="14" height="12" rx="4.8"/><rect x="10.6" y="6.6" width="3.6" height="10" rx="1.8"/><rect x="14.9" y="5.1" width="3.6" height="11.5" rx="1.8"/><rect x="19.2" y="6.6" width="3.6" height="10" rx="1.8"/><rect x="5.7" y="12.4" width="3.4" height="7.8" rx="1.7" transform="rotate(-27 7.4 16.3)"/></g></svg>') 16 24, pointer}`,
    // Transform-only keyframes: the pig is an ordinary flex item, so there is
    // no translateX(-50%) centring to preserve.
    "@keyframes dp-bob{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-7px) rotate(-2.5deg)}}",
    "@keyframes dp-breathe{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(1px) scale(1.09)}}",
    "@keyframes dp-shake{0%,100%{transform:translateX(0) rotate(0)}20%{transform:translateX(-4px) rotate(-5deg)}60%{transform:translateX(4px) rotate(5deg)}}",
    "@keyframes dp-spin{0%{transform:rotate(0)}50%{transform:rotate(180deg) scale(1.2)}100%{transform:rotate(360deg)}}",
    "@keyframes dp-jump{0%{transform:translateY(0)}30%{transform:translateY(-26px) scale(1.12)}60%{transform:translateY(0) scale(.92)}100%{transform:translateY(0)}}",
    "@keyframes dp-wobble{0%,100%{transform:rotate(0)}20%{transform:rotate(-14deg)}55%{transform:rotate(14deg)}}",
    "@keyframes dp-cough{0%,100%{transform:translateX(0)}30%{transform:translateX(-4px) rotate(-7deg)}70%{transform:translateX(4px) rotate(6deg)}}",
    '.dp-pig[data-mood="happy"]{animation-duration:1.15s}',
    '.dp-pig[data-mood="sleepy"]{animation-name:dp-breathe;animation-duration:3.6s}',
    '.dp-pig[data-mood="hungry"]{animation-name:dp-shake;animation-duration:2.4s}',
    '.dp-pig[data-mood="dirty"]{animation-name:dp-breathe;animation-duration:2.6s;filter:sepia(.4) drop-shadow(0 4px 6px rgba(61,52,40,.28))}',
    '.dp-pig[data-mood="sick"]{animation-name:dp-cough;animation-duration:2.2s;filter:hue-rotate(-28deg) saturate(.75) drop-shadow(0 4px 6px rgba(61,52,40,.28))}',
    // One pose per activity, so being away reads as a thing the pig is doing.
    "@keyframes dp-typing{0%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-2px) rotate(-1.5deg)}50%{transform:translateY(0) rotate(0)}75%{transform:translateY(-2px) rotate(1.5deg)}}",
    "@keyframes dp-reading{0%,100%{transform:translateY(0) rotate(0)}35%{transform:translateY(1px) rotate(-5deg)}70%{transform:translateY(1px) rotate(-2deg)}}",
    "@keyframes dp-walking{0%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-6px) rotate(-4deg)}50%{transform:translateY(0) rotate(0)}75%{transform:translateY(-6px) rotate(4deg)}}",
    '.dp-pig[data-mood="working"]{animation-name:dp-typing;animation-duration:.7s}',
    '.dp-pig[data-mood="studying"]{animation-name:dp-reading;animation-duration:2.4s}',
    '.dp-pig[data-mood="traveling"]{animation-name:dp-walking;animation-duration:1s}',
    '.dp-pig[data-mood="dead"]{animation:none;filter:grayscale(1)}',
    ".dp-pig[data-react]{animation-duration:.85s;animation-iteration-count:1}",
    '.dp-pig[data-react="feed"]{animation-name:dp-jump}',
    '.dp-pig[data-react="bathe"]{animation-name:dp-wobble;animation-duration:1.05s}',
    '.dp-pig[data-react="play"]{animation-name:dp-spin;animation-duration:.9s}',
    '.dp-pig[data-react="away"]{animation-name:dp-jump;animation-duration:.9s}',
    '.dp-pig[data-react="cure"]{animation-name:dp-spin;animation-duration:.9s}',
    '.dp-pig[data-react="levelup"]{animation-name:dp-jump;animation-duration:.95s}',
    '.dp-pig[data-react="refuse"]{animation-name:dp-shake;animation-duration:.5s}',
    /* ---------- what the pig is off doing ---------- */
    "[data-dsh-pig] .dp-work{display:flex;flex-direction:column;align-items:center;gap:4px;",
    "margin:0 2px 6px 0}",
    ".dp-prop{font-size:26px;line-height:1;filter:drop-shadow(0 3px 5px rgba(61,52,40,.22));",
    "animation:dp-prop-bob 2.4s ease-in-out infinite}",
    '[data-dsh-pig][data-away="study"] .dp-prop{animation-duration:3.4s}',
    '[data-dsh-pig][data-away="trip"] .dp-prop{animation-name:dp-prop-swing;animation-duration:1.6s}',
    '[data-dsh-pig][data-away="interest"] .dp-prop{animation-duration:3.4s}',
    "@keyframes dp-prop-bob{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-3px) rotate(3deg)}}",
    "@keyframes dp-prop-swing{0%,100%{transform:translateY(0) rotate(-8deg)}50%{transform:translateY(-4px) rotate(8deg)}}",
    ".dp-progress{width:42px;height:7px;border-radius:var(--ac-pill);background:var(--ac-bg-disabled);",
    "box-shadow:var(--ac-inset);overflow:hidden}",
    ".dp-progress i{display:block;height:100%;border-radius:var(--ac-pill);",
    "background:var(--ac-primary);transition:width .5s var(--ac-ease)}",
    // The scene needs room for the prop; it grows leftward, so the pig stays put.
    '[data-dsh-pig][data-away="work"] .dp-scene,[data-dsh-pig][data-away="study"] .dp-scene,',
    '[data-dsh-pig][data-away="interest"] .dp-scene,',
    '[data-dsh-pig][data-away="trip"] .dp-scene{width:max-content;min-width:132px}',
    // 加冕后的形态有动作立绘（桌子、书、行李都画在图里）：不再摆 emoji 道具，
    // 动作也收小，免得把画里的东西甩来甩去（立绘与动作来自 PR #2）。
    '[data-dsh-pig][data-art-actions="true"] .dp-prop{display:none}',
    '.dp-pig[data-art-actions="true"][data-mood="working"]:not([data-react]){animation:dp-king-work 1.4s ease-in-out infinite}',
    '.dp-pig[data-art-actions="true"][data-mood="studying"]:not([data-react]){animation:dp-king-study 2.4s ease-in-out infinite}',
    '.dp-pig[data-art-actions="true"][data-mood="traveling"]:not([data-react]){animation:dp-king-walk .8s ease-in-out infinite}',
    "@keyframes dp-king-work{0%,100%{transform:translateY(0)}50%{transform:translateY(1px) rotate(1deg)}}",
    "@keyframes dp-king-study{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}",
    "@keyframes dp-king-walk{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-3px) rotate(2deg)}}",
    /* ---------- hud: a cream tag beside the pig ---------- */
    ".dp-hud{position:absolute;left:9px;top:7px;display:flex;flex-direction:column;gap:1px;",
    "font-size:10.5px;font-weight:600;line-height:1.45;color:var(--ac-text);",
    "background:var(--ac-bg);border:2px solid var(--ac-border-light);padding:5px 10px;",
    "border-radius:var(--ac-radius-sm);box-shadow:var(--ac-shadow-sm)}",
    ".dp-hud b{font-weight:700}",
    // A drawn sprite is sized by the same variable as the emoji, so growing up
    // works identically either way.
    ".dp-pig-img{width:var(--pig-size);height:var(--pig-size);display:block;",
    "-webkit-user-drag:none;user-select:none}",
    ".dp-pig-emoji{font-size:var(--pig-size);line-height:1}",
    // No drawings yet — every stage is the same pig, so age reads as size plus
    // a faded coat on the last one.
    '[data-dsh-pig][data-faded="true"] .dp-pig-emoji{filter:grayscale(.5) opacity(.72)}',
    // The box advertises itself: a slow breathing glow plus a label, so it
    // does not read as scenery.
    '[data-dsh-pig][data-unhatched="true"] .dp-pig{cursor:pointer;',
    "animation:dp-box-breathe 2.4s ease-in-out infinite}",
    '[data-dsh-pig][data-unhatched="true"] .dp-pig-emoji{',
    "filter:drop-shadow(0 0 0 rgba(255,214,102,0)) drop-shadow(0 4px 6px rgba(61,52,40,.28))}",
    "@keyframes dp-box-breathe{0%,100%{transform:translateY(0) scale(1)}",
    "50%{transform:translateY(-3px) scale(1.06)}}",
    ".dp-poke-hint{position:absolute;right:2px;bottom:-2px;display:flex;align-items:center;gap:3px;",
    "font-size:9.5px;font-weight:700;color:var(--ac-text);background:var(--ac-bg);",
    "border:1.5px solid var(--ac-border-light);border-radius:var(--ac-pill);padding:1px 7px;",
    "box-shadow:0 2px 0 rgba(61,52,40,.12);pointer-events:none;white-space:nowrap;z-index:3;",
    "animation:dp-hint-bob 1.6s ease-in-out infinite}",
    "@keyframes dp-hint-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}",
    // Each poke shakes it harder; the third one opens it instead.
    '[data-dsh-pig] .dp-pig[data-mood="poke"],',
    "[data-dsh-pig][data-poke] .dp-pig{animation-name:dp-poke-shake}",
    '[data-dsh-pig][data-poke="2"] .dp-pig{animation-duration:.28s}',
    "@keyframes dp-poke-shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-7deg)}",
    "50%{transform:rotate(6deg)}75%{transform:rotate(-4deg)}}"
    // The shop's tiles live in css-tiles.js since B8.
  ].join("");

  // src/client/css-tabs.js
  var CSS_TABS = [
    /* ---------- developer tab ---------- */
    ".dp-dev-note{font-size:10px;color:var(--ac-text-2);margin:4px 0 2px;line-height:1.5}",
    ".dp-dev-row{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 2px}",
    ".dp-dev-btn{flex:0 0 auto;font-size:10px;padding:3px 8px}",
    ".dp-on{background:var(--ac-primary);color:#fff;border-color:var(--ac-primary)}",
    '[data-dsh-pig][data-dev="true"] .dp-ico[data-tab="dev"]{color:var(--ac-primary)}',
    /* ---------- the soul that settles on an unclaimed grave ---------- */
    ".dp-soul{position:absolute;left:50%;transform:translateX(-50%);top:-4px;font-size:22px;",
    "line-height:1;opacity:.9;pointer-events:none;z-index:1;",
    "animation:dp-haunt 3.4s ease-in-out infinite}",
    "@keyframes dp-haunt{0%,100%{transform:translate(-50%,0) scale(1);opacity:.75}",
    "50%{transform:translate(-50%,-9px) scale(1.08);opacity:1}}",
    // A grave does not bob about like a living pig.
    '.dp-pig[data-stage="grave"]{animation:none;filter:grayscale(.35) drop-shadow(0 4px 6px rgba(61,52,40,.3))}',
    '.dp-pig[data-stage="box"]{animation:dp-box-wobble 3.2s ease-in-out infinite}',
    "@keyframes dp-box-wobble{0%,100%{transform:rotate(0)}30%{transform:rotate(-4deg)}",
    "45%{transform:rotate(3deg)}60%{transform:rotate(-2deg)}}",
    // Patting squashes the pig flat. Short, so rapid clicking keeps up.
    '[data-dsh-pig] .dp-pig[data-react="pet"]{animation-name:dp-squash;animation-duration:.42s}',
    "@keyframes dp-squash{0%{transform:scale(1,1)}35%{transform:scale(1.16,.74) translateY(2px)}",
    "60%{transform:scale(.94,1.08) translateY(-3px)}100%{transform:scale(1,1)}}",
    /* ---------- speech bubble ---------- */
    // `z-index` matters: the pig comes later in the DOM, so without it the pig
    // paints over the bubble whenever the two boxes overlap — which is exactly
    // what happened when collapsed and the scene was only as wide as the pig.
    ".dp-bubble{position:absolute;right:8px;top:7px;z-index:2;max-width:162px;padding:6px 10px;",
    "border-radius:var(--ac-radius-sm);font-size:10.5px;font-weight:600;line-height:1.45;",
    "color:var(--ac-text-body);background:var(--ac-bg-input);",
    "border:2px solid var(--ac-border-light);box-shadow:var(--ac-shadow-sm)}",
    // Tail drawn as a small rotated square so the 2px border stays continuous.
    '.dp-bubble::after{content:"";position:absolute;left:14px;bottom:-6px;width:8px;height:8px;',
    "background:var(--ac-bg-input);border-right:2px solid var(--ac-border-light);",
    "border-bottom:2px solid var(--ac-border-light);transform:rotate(45deg)}",
    // Reply buttons under a line: small pills, the mint of the primary colour
    // without the 3D base, which the spec keeps for real primary buttons.
    ".dp-bubble-replies{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}",
    // 猪头上的日常气泡（签到 / 礼包）：不用新颜色，沿用主色与卡片底色。
    // 挂在场景**上方**（不是 top 边缘）：折叠时场景就是猪本身，用 top:-6px
    // 会让气泡叠在猪头上（用户反馈 #6）。
    ".dp-daily{position:absolute;bottom:calc(100% + 7px);left:50%;width:36px;margin-left:-18px;",
    "font:inherit;font-size:15px;line-height:1;padding:3px 0;cursor:pointer;text-align:center;",
    "border:2px solid var(--ac-border);border-radius:50px;background:var(--ac-bg-input);",
    "box-shadow:0 3px 0 rgba(61,52,40,.14);animation:dp-daily-bob 2.4s var(--ac-ease) infinite}",
    // 折叠时场景就剩猪本身（而且它还在上下浮动 ±7px），再多让开一点。
    '[data-dsh-pig][data-open="false"] .dp-daily{bottom:calc(100% + 16px)}',
    // 展开时场景有面板那么宽、那么高，挂在场景上方会压到图标栏（B8 截图里压在「商店」上）：
    // 改成蹲在猪左边、贴着猪身子（再高会碰到左边的名字框）。
    '[data-dsh-pig][data-open="true"] .dp-daily{left:auto;margin-left:0;',
    "right:calc(6px + var(--pig-size) + 10px);bottom:calc(var(--pig-gap-below) + 4px)}",
    ".dp-daily:hover{border-color:var(--ac-border-hover)}",
    ".dp-daily:focus-visible{outline:2px solid var(--ac-primary);outline-offset:1px}",
    // 名字必须独占：叫 dp-bob 会覆盖猪的待机动画（css-base.js），
    // 而那个动画的 transform 一被替掉，猪就会横跳半个身位。
    // 只上下浮：横向居中改用 margin，展开时才能挪到猪旁边。
    "@keyframes dp-daily-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}",
    // 日记：折叠时只有首句，展开是全文。
    ".dp-diary{cursor:pointer}",
    '.dp-diary[data-open="true"] .dp-diary-full{display:block}',
    ".dp-diary-full{margin-top:4px;line-height:1.5}",
    ".dp-reply{font:inherit;font-size:10px;font-weight:700;padding:2px 9px;cursor:pointer;",
    "border-radius:var(--ac-pill);border:2px solid var(--ac-border-light);background:var(--ac-bg);",
    "color:var(--ac-text);transition:border-color .15s var(--ac-ease)}",
    ".dp-reply:hover{border-color:var(--ac-border-hover)}",
    ".dp-reply:focus-visible{outline:2px solid var(--ac-primary);outline-offset:1px}",
    // Collapsed, the scene is exactly the pig, so a bubble drawn inside it
    // would sit on the pig's face. Float it above the head with the tail
    // pointing down, anchored to the right edge so it can never run off the
    // window. The hearts rise from behind it.
    '[data-dsh-pig][data-open="false"] .dp-bubble{top:auto;bottom:calc(100% + 8px);',
    "left:auto;right:0;max-width:230px}",
    '[data-dsh-pig][data-open="false"] .dp-bubble::after{left:auto;right:26px;',
    "top:100%;bottom:auto;margin:0;transform:rotate(45deg);",
    "border:0;border-right:2px solid var(--ac-border-light);",
    "border-bottom:2px solid var(--ac-border-light)}",
    /* ---------- icon bar: the library sidebar, laid on its side ---------- */
    ".dp-bar{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;padding:8px;",
    "background:var(--ac-bg-content);border-top:2px solid var(--ac-border-light);",
    "border-bottom:2px solid var(--ac-border-light)}",
    ".dp-ico{display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;",
    "font:inherit;font-size:9.5px;font-weight:600;color:var(--ac-text-muted);background:none;",
    "border:2px solid transparent;border-radius:var(--ac-radius-sm);padding:5px 1px;",
    "transition:all .2s var(--ac-ease)}",
    ".dp-ico span.dp-ico-e{font-size:18px;line-height:1}",
    ".dp-ico:hover{background:var(--ac-hover)}",
    '.dp-ico[data-active="true"]{background:var(--ac-active);border-color:#9db0d6;',
    "color:var(--ac-text);font-weight:700}",
    ".dp-ico:focus-visible{outline:2px solid var(--ac-primary);outline-offset:1px}",
    "@keyframes dp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}",
    '.dp-ico[data-alert="true"] span.dp-ico-e{animation:dp-pulse 1.4s ease-in-out infinite}',
    /* ---------- content ---------- */
    ".dp-content{padding:12px 13px 13px;overflow-y:auto;flex:1 1 auto;min-height:0}",
    ".dp-content::-webkit-scrollbar{width:8px}",
    ".dp-content::-webkit-scrollbar-thumb{background:var(--ac-border-light);border-radius:4px}",
    ".dp-content::-webkit-scrollbar-track{background:transparent}",
    ".dp-title{display:flex;justify-content:space-between;align-items:baseline;font-size:11px;",
    "margin-bottom:8px}",
    ".dp-title b{font-weight:700;color:var(--ac-text)}",
    ".dp-title span{color:var(--ac-text-2);font-size:10.5px;font-weight:600}",
    ".dp-row{display:flex;justify-content:space-between;font-size:11px;font-weight:600;",
    "color:var(--ac-text-body);margin:2px 0}",
    ".dp-row b{font-weight:700;color:var(--ac-text)}",
    /* ---------- attribute bars: pill track with an inset well ---------- */
    ".dp-meter{height:9px;border-radius:var(--ac-pill);background:var(--ac-bg-disabled);",
    "box-shadow:var(--ac-inset);overflow:hidden;margin:3px 0 8px}",
    ".dp-meter i{display:block;height:100%;border-radius:var(--ac-pill);",
    "background:var(--ac-warning);transition:width .35s var(--ac-ease)}",
    ".dp-meter.dp-mood i{background:#f8a6b2}",
    ".dp-meter.dp-clean i{background:#82d5bb}",
    ".dp-meter.dp-health i{background:#8ac68a}",
    ".dp-traits{display:flex;gap:10px;font-size:10.5px;font-weight:600;color:var(--ac-text-2);",
    "margin:8px 0 3px}",
    /* ---------- banners ---------- */
    ".dp-alert{margin:0 0 9px;padding:8px 10px;border-radius:var(--ac-radius-sm);",
    "font-size:10.5px;font-weight:600;line-height:1.55;border:2px solid}",
    ".dp-alert b{font-weight:700;color:var(--ac-text)}",
    ".dp-alert.dp-sick{background:#fdeeee;border-color:#f2c2c2}",
    ".dp-alert.dp-work{background:#eef1fb;border-color:#c3cdf0}",
    ".dp-alert.dp-dead{background:var(--ac-bg-disabled);border-color:var(--ac-border-light)}",
    ".dp-alert.dp-legacy{background:#fdf7e2;border-color:#f0dfa8}",
    /* ---------- buttons: secondary is a cream pill with soft elevation ---- */
    ".dp-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}",
    ".dp-btn{display:flex;align-items:center;justify-content:center;gap:5px;font:inherit;",
    "font-size:11px;font-weight:700;letter-spacing:.02em;color:var(--ac-text-body);",
    "cursor:pointer;padding:8px 6px;border-radius:var(--ac-pill);",
    "border:2px solid var(--ac-border);background:var(--ac-bg-input);",
    "box-shadow:var(--ac-shadow-sm);transition:all .2s var(--ac-ease)}",
    ".dp-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:var(--ac-shadow);",
    "border-color:var(--ac-border-hover)}",
    ".dp-btn:active:not(:disabled){transform:translateY(2px);box-shadow:var(--ac-shadow-sm)}",
    ".dp-btn:focus-visible{outline:2px solid var(--ac-primary);outline-offset:1px}",
    ".dp-btn:disabled{background:var(--ac-bg-disabled);color:var(--ac-text-disabled);",
    "border-color:var(--ac-border-light);box-shadow:none;cursor:not-allowed}",
    ".dp-btn-wide{grid-column:1/-1}",
    ".dp-btn .dp-wait{color:var(--ac-text-2);font-size:10px;font-weight:600}",
    /* ---------- segmented control ---------- */
    ".dp-seg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:9px}",
    ".dp-seg button{font:inherit;font-size:10.5px;font-weight:600;color:var(--ac-text-muted);",
    "cursor:pointer;padding:6px 2px;border-radius:var(--ac-pill);",
    "border:2px solid var(--ac-border-light);background:var(--ac-bg-input);",
    // One line, always: a label that wraps makes its button taller than the rest.
    "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;",
    "transition:all .2s var(--ac-ease)}",
    ".dp-seg button:hover{background:var(--ac-hover)}",
    // The work tab has three skills, not four stages.
    ".dp-seg.dp-seg-3{grid-template-columns:repeat(3,minmax(0,1fr))}",
    // Work rows: two small buttons on the right, 详情 opens the checklist below.
    ".dp-job-locked{opacity:.75}",
    ".dp-job-detail{margin-top:-2px}",
    ".dp-req{font-size:10.5px;font-weight:600;color:var(--ac-error);line-height:1.6}",
    ".dp-req.dp-req-ok{color:var(--ac-success)}",
    '.dp-seg button[data-active="true"]{background:var(--ac-active);border-color:#9db0d6;',
    "color:var(--ac-text);font-weight:700}",
    /* ---------- list rows ---------- */
    // minmax(0,1fr): a long nowrap line must ellipsize, not widen the panel.
    ".dp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}",
    ".dp-list{display:flex;flex-direction:column;gap:7px}",
    ".dp-shelf{margin:9px 0 1px;font-size:10px;font-weight:700;color:var(--ac-text-2);",
    "letter-spacing:.04em}",
    ".dp-shelf:first-child{margin-top:0}",
    ".dp-item{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:600;",
    "color:var(--ac-text-body);padding:7px 9px;border-radius:var(--ac-radius-sm);",
    "background:var(--ac-bg-content);border:2px solid var(--ac-border-light)}",
    ".dp-item .dp-grow{flex:1;min-width:0}",
    ".dp-item .dp-dim{color:var(--ac-text-2);font-size:10px;font-weight:500;overflow:hidden;",
    "text-overflow:ellipsis;white-space:nowrap}",
    ".dp-item.dp-wanted{background:#fdf7e2;border-color:var(--ac-warning)}",
    // B6 talk row: name + 改 + 免打扰, and the inline name input.
    ".dp-talk{gap:6px;margin-top:8px}",
    ".dp-talk>span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".dp-mini-plain{background:var(--ac-bg-input);color:var(--ac-text);border:2px solid var(--ac-border-light);box-shadow:none}",
    ".dp-mini-plain:hover:not(:disabled){background:var(--ac-hover)}",
    ".dp-input{flex:1;min-width:0;font:inherit;font-size:11px;padding:3px 8px;border-radius:var(--ac-pill);",
    "border:2px solid var(--ac-border);background:var(--ac-bg-input);color:var(--ac-text)}",
    ".dp-input:focus{outline:2px solid var(--ac-primary);outline-offset:1px}",
    /* ---------- primary buttons: teal pill with the game 3D bottom edge --- */
    ".dp-mini{font:inherit;font-size:10.5px;font-weight:700;letter-spacing:.02em;color:#fff;",
    "cursor:pointer;padding:6px 13px;border-radius:var(--ac-pill);",
    "border:2px solid var(--ac-primary-active);background:var(--ac-primary);",
    "box-shadow:0 3px 0 0 var(--ac-primary-active);transition:all .15s var(--ac-ease)}",
    ".dp-mini:hover:not(:disabled){background:var(--ac-primary-hover);transform:translateY(-1px);",
    "box-shadow:0 4px 0 0 var(--ac-primary-active)}",
    ".dp-mini:active:not(:disabled){transform:translateY(2px);",
    "box-shadow:0 1px 0 0 var(--ac-primary-active)}",
    ".dp-mini:focus-visible{outline:2px solid var(--ac-primary);outline-offset:2px}",
    ".dp-mini:disabled{background:var(--ac-bg-disabled);color:var(--ac-text-disabled);",
    "border-color:var(--ac-border-light);box-shadow:none;cursor:not-allowed}",
    /* ---------- the care item picker ---------- */
    ".dp-pick{margin-top:9px;padding:9px 10px;border-radius:var(--ac-radius-sm);font-size:10.5px;",
    "background:var(--ac-bg-content);border:2px solid var(--ac-border-light)}",
    ".dp-pick-head{font-size:10.5px;font-weight:700;color:var(--ac-text);margin-bottom:7px}",
    ".dp-cancel{display:block;width:100%;margin-top:8px;font:inherit;font-size:10.5px;",
    "font-weight:600;color:var(--ac-text-2);cursor:pointer;padding:5px;",
    "border-radius:var(--ac-pill);border:2px solid var(--ac-border-light);",
    "background:var(--ac-bg-input);transition:all .2s var(--ac-ease)}",
    ".dp-cancel:hover{background:var(--ac-hover);color:var(--ac-text)}",
    ".dp-count{margin-left:2px;font-size:9px;font-weight:700;color:var(--ac-text-2);",
    "background:var(--ac-bg-content);border-radius:var(--ac-pill);padding:0 5px}",
    '.dp-btn[data-open-picker="true"]{background:var(--ac-active);border-color:#9db0d6}',
    '.dp-seg button[data-locked="true"]{color:var(--ac-text-disabled);',
    "border-style:dashed;background:var(--ac-bg-disabled)}",
    '.dp-seg button[data-locked="true"]:hover{background:var(--ac-bg-disabled)}',
    ".dp-locked{margin:0 0 8px;font-size:10.5px;font-weight:600;line-height:1.5;",
    "color:var(--ac-text-body);background:#fdf7e2;border:2px solid #f0dfa8;",
    "border-radius:var(--ac-radius-sm);padding:6px 9px}",
    // The per-job gate reads as a lock, not as another grey stat line: a
    // threshold the pig cannot see is indistinguishable from a broken button.
    ".dp-lock{font-size:10px;font-weight:700;line-height:1.5;color:#9a6b1f}",
    ".dp-empty{color:var(--ac-text-2);font-size:10.5px;font-weight:500;line-height:1.65;",
    "margin-top:4px}",
    ".dp-memo{margin-top:9px;padding-top:8px;border-top:2px solid var(--ac-border-light);",
    "color:var(--ac-text-muted);font-size:10px;font-weight:500;line-height:1.55;",
    "white-space:pre-wrap;word-break:break-word}",
    /* ---------- particles and toast ---------- */
    ".dp-fx{position:absolute;z-index:1;pointer-events:none;font-size:17px;",
    "animation:dp-rise 1.1s ease-out forwards}",
    "@keyframes dp-rise{0%{opacity:0;transform:translate(var(--dx0,0),4px) scale(.5)}18%{opacity:1}",
    "100%{opacity:0;transform:translate(var(--dx,0),-56px) scale(1.15)}}",
    ".dp-toast{position:absolute;left:9px;right:9px;top:8px;padding:8px 11px;",
    "border-radius:var(--ac-radius-sm);font-size:10.5px;font-weight:600;line-height:1.5;",
    "color:var(--ac-text);background:var(--ac-bg-input);border:2px solid var(--ac-border);",
    "box-shadow:var(--ac-shadow);pointer-events:none;white-space:normal;",
    "animation:dp-toast 4.6s var(--ac-ease) forwards}",
    "@keyframes dp-toast{0%{opacity:0;transform:translateY(-8px)}8%{opacity:1;transform:translateY(0)}",
    "82%{opacity:1}100%{opacity:0;transform:translateY(-6px)}}"
  ].join("");

  // src/client/css-tiles.js
  var CSS_TILES = [
    "[data-dsh-pig]{--tile-pink:#f8a6b2;--tile-purple:#b77dee;--tile-blue:#889df0;",
    "--tile-yellow:#f7cd67;--tile-orange:#e59266;--tile-teal:#82d5bb;--tile-green:#8ac68a;",
    "--tile-red:#fc736d;--tile-lime:#d1da49;--tile-peach:#e18c6f;--tile-brown:#9a835a}",
    '.dp-tile[data-color="pink"]{--tile-c:var(--tile-pink)}',
    '.dp-tile[data-color="purple"]{--tile-c:var(--tile-purple)}',
    '.dp-tile[data-color="blue"]{--tile-c:var(--tile-blue)}',
    '.dp-tile[data-color="yellow"]{--tile-c:var(--tile-yellow)}',
    '.dp-tile[data-color="orange"]{--tile-c:var(--tile-orange)}',
    '.dp-tile[data-color="teal"]{--tile-c:var(--tile-teal)}',
    '.dp-tile[data-color="green"]{--tile-c:var(--tile-green)}',
    '.dp-tile[data-color="red"]{--tile-c:var(--tile-red)}',
    '.dp-tile[data-color="lime"]{--tile-c:var(--tile-lime)}',
    '.dp-tile[data-color="peach"]{--tile-c:var(--tile-peach)}',
    '.dp-tile[data-color="brown"]{--tile-c:var(--tile-brown)}',
    // The grid: three columns that can never be widened by their content.
    ".dp-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 8px;padding:4px 2px 2px}",
    // A tile is a column: the coloured square, then its name, then a note.
    ".dp-tile{font:inherit;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;",
    "padding:0;margin:0;border:0;background:none;cursor:pointer;color:var(--ac-text)}",
    ".dp-tile-icon{position:relative;display:flex;align-items:center;justify-content:center;",
    "width:50px;height:50px;border-radius:15px;background:var(--tile-c,var(--ac-bg-content));",
    "box-shadow:0 3px 0 rgba(61,52,40,.16);transition:transform .15s var(--ac-ease),box-shadow .15s var(--ac-ease)}",
    ".dp-tile-e{font-size:24px;line-height:1;filter:drop-shadow(0 1px 1px rgba(61,52,40,.18))}",
    ".dp-tile:hover:not(:disabled) .dp-tile-icon{transform:translateY(-2px);box-shadow:0 5px 0 rgba(61,52,40,.16)}",
    ".dp-tile:active:not(:disabled) .dp-tile-icon{transform:translateY(2px);box-shadow:0 1px 0 rgba(61,52,40,.16)}",
    ".dp-tile:focus-visible{outline:none}",
    ".dp-tile:focus-visible .dp-tile-icon{outline:2px solid var(--ac-primary);outline-offset:2px}",
    // One line each, never wrapping: every tile in a row stays the same height.
    ".dp-tile-n,.dp-tile-note{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.25}",
    ".dp-tile-n{font-size:10.5px;font-weight:700}",
    ".dp-tile-note{font-size:9.5px;font-weight:600;color:var(--ac-text-2);margin-top:-2px}",
    // Corner marks on the square: a count top-right, a word top-left.
    ".dp-tile-badge,.dp-tile-tag{position:absolute;top:-5px;font-size:9px;font-weight:800;line-height:1;",
    "padding:3px 5px;border-radius:var(--ac-pill);white-space:nowrap;border:2px solid var(--ac-bg)}",
    ".dp-tile-badge{right:-6px;background:var(--ac-primary);color:#fff}",
    ".dp-tile-tag{left:-6px;background:var(--ac-warning);color:var(--ac-text)}",
    // Second layer: the same colour, a shade paler and a little smaller.
    // Sizes trimmed on 2026-10-01 (owner: the tiles were too big): 50px / 44px.
    ".dp-tile-soft .dp-tile-icon{width:44px;height:44px;border-radius:13px;",
    "background:color-mix(in srgb,var(--tile-c) 42%,#fffbe7)}",
    ".dp-tile-soft .dp-tile-e{font-size:21px}",
    // Locked: greyed but still openable (a stage can be looked into before it opens).
    '.dp-tile[data-locked="true"] .dp-tile-icon{filter:grayscale(.75);opacity:.6}',
    '.dp-tile[data-dim="true"] .dp-tile-icon,.dp-tile:disabled .dp-tile-icon{opacity:.45;box-shadow:none}',
    '.dp-tile[data-dim="true"] .dp-tile-n,.dp-tile:disabled .dp-tile-n{color:var(--ac-text-2)}',
    ".dp-tile:disabled{cursor:default}",
    '.dp-tile[data-active="true"] .dp-tile-icon{outline:3px solid var(--ac-active);outline-offset:2px}',
    // The second layer's top row: back, title, one grey line.
    ".dp-drill{display:flex;align-items:center;gap:7px;margin:0 0 10px}",
    ".dp-drill-back{font:inherit;font-size:16px;font-weight:800;line-height:1;width:26px;height:26px;",
    "flex:none;cursor:pointer;color:var(--ac-text);border-radius:50%;",
    "border:2px solid var(--ac-border-light);background:var(--ac-bg-input)}",
    ".dp-drill-back:hover{border-color:var(--ac-border-hover)}",
    ".dp-drill-title{font-size:12px;font-weight:800;color:var(--ac-text);white-space:nowrap}",
    ".dp-drill-info{flex:1;min-width:0;text-align:right;font-size:10px;font-weight:600;",
    "color:var(--ac-text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    // B9: the home screen replaces the bottom icon bar. The bar still exists
    // (its icons carry the alert state the home tiles read) but is not shown.
    "[data-dsh-pig] .dp-card .dp-bar{display:none}",
    ".dp-app-head{margin-bottom:12px}",
    // Out working, the collapsed scene shrinks to pig + prop; open, it must stay
    // as wide as the panel, or the name plate is squeezed onto the pig.
    '[data-dsh-pig][data-open="true"][data-away] .dp-scene{width:var(--panel-width)}',
    // Banners only live on the status tab now, with room to breathe below.
    "[data-dsh-pig] .dp-alert{margin-bottom:14px}",
    "[data-dsh-pig] .dp-alert + .dp-actions{margin-bottom:14px}",
    ".dp-job-go{display:block;width:100%;margin-top:9px}",
    // A picked tile's details (a diary page, a souvenir's story) sit under the grid.
    ".dp-tile-card{margin-top:12px}",
    // 更新 App: the release notes keep their line breaks but stay short.
    ".dp-update-notes{white-space:pre-wrap;font-size:10.5px;line-height:1.5;color:var(--ac-text-2);max-height:120px;overflow:auto;margin:4px 0 6px}",
    ".dp-update-back{margin-top:10px;width:100%}",
    ".dp-update-now{margin-bottom:12px}",
    ".dp-update-now .dp-btn,.dp-update-detail .dp-btn{width:100%;margin-top:8px}"
  ].join("");

  // src/client/css-card.js
  var CSS_CARD = [
    ".dp-vcard{position:relative;padding:14px 14px 12px;border-radius:20px;color:var(--ac-text-body);",
    "--vc-dot:rgba(196,184,158,.15);--vc-dot2:rgba(196,184,158,.1);--vc-bg:rgb(247,243,223);--vc-line:#d4c4a8;",
    "background:radial-gradient(circle,var(--vc-dot) 1.5px,transparent 1.5px),",
    "radial-gradient(circle,var(--vc-dot2) 1px,transparent 1px),var(--vc-bg);",
    "background-size:28px 28px,14px 14px;background-position:0 0,7px 7px;border:1.5px solid var(--vc-line)}",
    '.dp-vcard[data-sex="girl"]{--vc-dot:rgba(248,166,178,.18);--vc-dot2:rgba(255,200,210,.12);--vc-bg:#fde4e8;--vc-line:#f8a6b2}',
    '.dp-vcard[data-sex="boy"]{--vc-dot:rgba(136,157,240,.18);--vc-dot2:rgba(180,195,255,.12);--vc-bg:#e8edff;--vc-line:#889df0}',
    // Top: the photo and who it is.
    ".dp-vcard-top{display:flex;align-items:center;gap:12px;margin-bottom:12px}",
    ".dp-vcard-avatar{flex:none;width:72px;height:72px;border-radius:18px;display:flex;align-items:center;",
    "justify-content:center;background:#fffbe7;border:2px solid var(--vc-line);box-shadow:0 3px 0 rgba(61,52,40,.12)}",
    ".dp-vcard-img{width:56px;height:56px;display:block}",
    ".dp-vcard-e{font-size:40px;line-height:1}",
    ".dp-vcard-who{display:flex;flex-direction:column;gap:3px;min-width:0}",
    ".dp-vcard-name{font-size:15px;font-weight:800;color:var(--ac-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".dp-vcard-sub{font-size:10.5px;font-weight:600;color:var(--ac-text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    // 「标签：值」 rows.
    ".dp-vcard-row{display:flex;align-items:center;gap:6px;margin-top:7px;min-width:0}",
    ".dp-vcard-label{flex:none;width:44px;font-size:10.5px;font-weight:700;color:var(--ac-text)}",
    ".dp-vcard-value{flex:1;min-width:0;padding:5px 11px;border-radius:var(--ac-pill);background:#faf8f2;",
    "font-size:11px;font-weight:600;color:var(--ac-text-body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    // The motto is the pig talking: a bubble that may take two lines.
    ".dp-vcard-motto-row{align-items:flex-start}",
    ".dp-vcard-motto-row .dp-vcard-label{margin-top:6px}",
    ".dp-vcard-value.dp-vcard-motto{border-radius:12px;white-space:normal;line-height:1.45}",
    ".dp-vcard-edit{flex:none;font:inherit;font-size:12px;line-height:1;width:24px;height:24px;padding:0;cursor:pointer;",
    "border-radius:50%;border:2px solid var(--vc-line);background:#fffbe7}",
    ".dp-vcard-edit:hover{background:var(--ac-hover)}",
    ".dp-vcard-input{flex:1;min-width:0;padding:3px 9px;font-size:11px}",
    // In-place editing: the two buttons stay as small as the pencil they replace.
    ".dp-vcard-row .dp-mini{flex:none;padding:3px 9px;font-size:10px;box-shadow:none}",
    "[data-dsh-pig] .dp-vcard-row .dp-mini.dp-mini-plain{background:#fffbe7;color:var(--ac-text);border:2px solid var(--vc-line);box-shadow:none}",
    ".dp-vcard-foot{margin-top:12px;padding-top:9px;border-top:1.5px dashed var(--vc-line);",
    "font-size:10px;font-weight:600;color:var(--ac-text-2);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    // 加冕 App: one cream box per form, its picture on the left, conditions as small chips.
    ".dp-crown{margin-bottom:10px;padding:10px 12px;border-radius:16px;background:#fffbe7;border:2px dashed #e8c66a}",
    ".dp-crown.dp-crown-now{border-style:solid;background:#fdf3d0}",
    ".dp-crown-top{display:flex;gap:10px;align-items:flex-start}",
    ".dp-crown-pic{flex:none;width:58px;height:58px;border-radius:14px;display:flex;align-items:center;justify-content:center;",
    "background:#fff;border:2px solid #f0dca0;font-size:30px}",
    ".dp-crown-img{width:50px;height:50px;display:block}",
    ".dp-crown-side{flex:1;min-width:0}",
    ".dp-crown-head{font-size:12px;font-weight:800;color:var(--ac-text);margin-bottom:6px}",
    ".dp-crown-done{font-size:11px;font-weight:700;color:#3f8a62}",
    ".dp-crown-reqs{display:flex;flex-wrap:wrap;gap:4px}",
    ".dp-crown-req{padding:2px 7px;border-radius:var(--ac-pill);font-size:10px;font-weight:700;white-space:nowrap;",
    "background:#f3ece0;color:var(--ac-text-2)}",
    ".dp-crown-req.dp-crown-ok{background:#dff3e8;color:#3f8a62}",
    ".dp-crown .dp-btn{width:100%;margin-top:9px}"
  ].join("");

  // src/client/styles.js
  var CSS = CSS_BASE + CSS_TABS + CSS_TILES + CSS_CARD;

  // src/client/tabs/travel.js
  function renderTravelTab(ui) {
    if (ui.view.trips.length === 0) {
      ui.content.appendChild(el("div", "dp-empty", "\u5BBF\u4E3B\u8FD8\u6CA1\u63D0\u4F9B\u76EE\u7684\u5730\u3002"));
      return;
    }
    var list = el("div", "dp-list");
    for (var i = 0; i < ui.view.trips.length; i += 1) {
      (function(trip) {
        var row = el("div", "dp-item");
        row.appendChild(el("span", null, trip.emoji));
        var grow = el("div", "dp-grow");
        grow.appendChild(el("div", null, trip.label));
        grow.appendChild(el("div", "dp-dim", formatMinutes(trip.minutes) + " \xB7 " + trip.cost + " \u{1FA99}" + (trip.bestRarity ? " \xB7 \u53EF\u5E26\u56DE " + trip.bestRarityEmoji + trip.bestRarity : "")));
        row.appendChild(grow);
        var go = button("dp-mini", { "data-trip": trip.key }, function() {
          ui.send("trip", { trip: trip.key });
        });
        go.textContent = "\u51FA\u53D1";
        go.disabled = !ui.view.canGoOut || !trip.affordable;
        row.appendChild(go);
        list.appendChild(row);
      })(ui.view.trips[i]);
    }
    ui.content.appendChild(list);
    var souvenirs = ui.view.pig.souvenirs;
    var head = el("div", "dp-title");
    head.style.marginTop = "10px";
    head.appendChild(el("b", null, "\u{1F381} \u7EAA\u5FF5\u54C1 " + souvenirs.length));
    ui.content.appendChild(head);
    if (souvenirs.length === 0) {
      ui.content.appendChild(el("div", "dp-empty", "\u8FD8\u6CA1\u51FA\u8FC7\u8FDC\u95E8\u3002"));
      return;
    }
    var chips = el("div", "dp-grid");
    for (var s = 0; s < souvenirs.length; s += 1) {
      (function(entry) {
        var chip = button("dp-item", { "data-souvenir": entry.key }, function() {
          ui.souvenirPick = ui.souvenirPick === entry.key ? null : entry.key;
          ui.renderContent();
        });
        chip.appendChild(el("span", null, entry.emoji));
        var grow = el("div", "dp-grow");
        grow.appendChild(el("div", null, entry.label));
        grow.appendChild(el("div", "dp-dim", entry.rarityEmoji + entry.rarityLabel + (entry.price > 0 ? " \xB7 \u503C " + entry.price + " \u{1FA99}" : "")));
        chip.appendChild(grow);
        chips.appendChild(chip);
      })(souvenirs[s]);
    }
    ui.content.appendChild(chips);
    var picked = null;
    for (var q = 0; q < souvenirs.length; q += 1) if (souvenirs[q].key === ui.souvenirPick) picked = souvenirs[q];
    if (picked !== null) {
      var souvenirCard = el("div", "dp-locked");
      souvenirCard.appendChild(el("div", null, picked.emoji + " " + picked.label + " \xB7 " + picked.rarityEmoji + picked.rarityLabel + (picked.fromLabel === "" ? "" : " \xB7 \u6765\u81EA" + picked.fromLabel)));
      souvenirCard.appendChild(el("div", null, picked.story === "" ? "\uFF08\u8FD9\u53EA\u7EAA\u5FF5\u54C1\u662F\u65E7\u7248\u672C\u5E26\u56DE\u6765\u7684\uFF0C\u6CA1\u6709\u7559\u4E0B\u6545\u4E8B\u3002\uFF09" : "\u300C" + picked.story + "\u300D"));
      if (picked.price > 0) {
        var sell = button("dp-mini", { "data-sell": picked.key }, function() {
          ui.souvenirPick = null;
          ui.send("sell", { souvenir: picked.key });
        });
        sell.textContent = "\u5356\u6389 +" + picked.price + " \u{1FA99}";
        sell.style.marginTop = "6px";
        souvenirCard.appendChild(sell);
      }
      ui.content.appendChild(souvenirCard);
    }
  }

  // src/client/tabs/work.js
  var SKILLS = [
    { key: "strong", emoji: "\u{1F4AA}", label: "\u6B66\u529B", color: "orange" },
    { key: "charm", emoji: "\u2728", label: "\u9B45\u529B", color: "pink" },
    { key: "intel", emoji: "\u{1F9E0}", label: "\u667A\u529B", color: "blue" }
  ];
  function renderWorkTab(ui) {
    if (ui.view.jobs.length === 0) {
      ui.content.appendChild(el("div", "dp-empty", "\u5BBF\u4E3B\u8FD8\u6CA1\u63D0\u4F9B\u5DE5\u4F5C\u5217\u8868\u3002"));
      return;
    }
    var bySkill = ui.view.jobs.some(function(job) {
      return job.trait !== "";
    });
    if (!bySkill) {
      renderJobs(ui, ui.view.jobs, "orange");
      return;
    }
    var skill = SKILLS.find(function(entry) {
      return entry.key === ui.drill.work;
    });
    if (skill === void 0) {
      renderSkills(ui);
      return;
    }
    var chosen = skill;
    drillHeader(ui, "work", chosen.emoji + " " + chosen.label, "");
    renderJobs(ui, ui.view.jobs.filter(function(job) {
      return job.trait === chosen.key;
    }), chosen.color);
  }
  function renderSkills(ui) {
    var grid = tileGrid();
    for (var s = 0; s < SKILLS.length; s += 1) {
      (function(skill) {
        var open = ui.view.jobs.filter(function(job) {
          return job.trait === skill.key && job.qualified;
        }).length;
        grid.appendChild(tile({
          emoji: skill.emoji,
          label: skill.label,
          color: skill.color,
          badge: open > 0 ? String(open) : "",
          data: { "data-skill": skill.key },
          onPick: function() {
            drillTo(ui, "work", skill.key);
          }
        }));
      })(SKILLS[s]);
    }
    ui.content.appendChild(grid);
  }
  function renderJobs(ui, jobs, color) {
    var grid = tileGrid();
    var picked = null;
    for (var i = 0; i < jobs.length; i += 1) {
      (function(job) {
        var active = ui.drill.pick === job.key;
        if (active) picked = job;
        var locked = job.qualified === false;
        grid.appendChild(tile({
          emoji: job.emoji,
          label: job.label,
          color,
          soft: true,
          active,
          note: job.minutes + "\u5206\xB7" + job.coins + "\u{1FA99}",
          tag: locked ? "\u{1F512}" : "",
          dim: locked,
          data: { "data-job-tile": job.key },
          onPick: function() {
            ui.drill.pick = active ? null : job.key;
            ui.renderContent();
          }
        }));
      })(jobs[i]);
    }
    ui.content.appendChild(grid);
    if (picked !== null) ui.content.appendChild(jobDetails(ui, picked));
  }
  function jobDetails(ui, job) {
    var box = el("div", "dp-pick dp-tile-card dp-job-detail");
    box.appendChild(el("div", "dp-pick-head", job.emoji + " " + job.label + " \xB7 " + (job.qualified ? "\u6761\u4EF6\u90FD\u591F\u4E86" : "\u8FD8\u5DEE\u8FD9\u4E9B")));
    for (var r = 0; r < job.requirements.length; r += 1) {
      var need = job.requirements[r];
      var have = need.kind === "level" ? "\uFF08\u73B0\u5728 Lv." + need.have + "\uFF09" : need.kind === "certificate" ? "\uFF08" + need.have + "/" + need.need + " \u6B21\uFF09" : need.kind === "every" || need.kind === "anyOf" ? "\uFF08" + need.have + "/" + need.need + " \u95E8\uFF09" : "\uFF08\u73B0\u5728 " + need.have + " \u8282\uFF09";
      box.appendChild(el("div", need.met ? "dp-req dp-req-ok" : "dp-req", (need.met ? "\u2713 " : "\u2717 ") + need.text + (need.met ? "" : " " + have)));
    }
    if (job.requirements.length === 0 && job.lockText) box.appendChild(el("div", "dp-req", "\u2717 " + job.lockText));
    box.appendChild(el("div", "dp-dim", job.minutes + " \u5206\u949F \xB7 " + job.coins + " \u{1FA99} \xB7 " + job.traitEmoji + job.traitLabel + " " + job.traitPoints + (job.payPercent > 0 ? "\uFF08+" + job.payPercent + "%\uFF09" : "") + " \xB7 \u9971\u98DF " + job.satiety + " \xB7 \u6E05\u6D01 " + job.cleanliness));
    var go = button("dp-btn dp-btn-wide dp-job-go", { "data-job": job.key }, function() {
      ui.send("work", { job: job.key });
    });
    go.textContent = "\u{1F4BC} \u51FA\u53D1";
    go.disabled = !ui.view.canGoOut || job.qualified === false;
    box.appendChild(go);
    return box;
  }

  // src/client/art.js
  var REACTION_ART = { feed: "eat", bathe: "bathe", play: "play", pet: "pet", cure: "relaxed", levelup: "relaxed" };
  var ACTIVITY_ART = { work: "work", study: "study", interest: "study", trip: "trip" };
  function syncPigArt(pig, image) {
    var base = pig.getAttribute("data-art");
    if (!base) return;
    var art = base;
    if (pig.getAttribute("data-art-actions") === "true") {
      var action = REACTION_ART[pig.getAttribute("data-react")] || ACTIVITY_ART[pig.getAttribute("data-activity")];
      if (action) art += "-" + action;
    }
    var src = ART_URL + art + ".svg";
    if (image.getAttribute("src") !== src) image.src = src;
  }

  // src/client/effects.js
  function createEffects(deps) {
    var scene = deps.scene;
    var pig = deps.pig;
    var card = deps.card;
    var bubble = deps.bubble;
    var isStopped = deps.isStopped;
    var reactTimer = null;
    var bubbleTimer = null;
    function react(kind, ms) {
      if (reactTimer !== null) window.clearTimeout(reactTimer);
      pig.removeAttribute("data-react");
      void pig.offsetWidth;
      pig.setAttribute("data-react", kind);
      syncPigArt(pig, deps.pigArt);
      reactTimer = window.setTimeout(function() {
        pig.removeAttribute("data-react");
        syncPigArt(pig, deps.pigArt);
        reactTimer = null;
      }, ms || 900);
    }
    function burst(emojis, count) {
      for (var i = 0; i < (count || 1); i += 1) {
        (function(index) {
          window.setTimeout(function() {
            if (isStopped()) return;
            var node = el("span", "dp-fx", emojis[index % emojis.length]);
            node.style.setProperty("--dx", Math.round((Math.random() - 0.5) * 46) + "px");
            var spot = headSpot();
            node.style.left = spot.x + Math.round((Math.random() - 0.5) * 22) + "px";
            node.style.top = spot.y + "px";
            scene.appendChild(node);
            window.setTimeout(function() {
              node.remove();
            }, 1200);
          }, index * 110);
        })(i);
      }
    }
    function headSpot() {
      var fallback = { x: 24, y: 8 };
      if (typeof pig.getBoundingClientRect !== "function" || typeof scene.getBoundingClientRect !== "function") return fallback;
      var p = pig.getBoundingClientRect();
      var s = scene.getBoundingClientRect();
      if (p.width === 0 && p.height === 0) return fallback;
      return { x: p.left - s.left + p.width / 2, y: p.top - s.top - 20 };
    }
    var REACTIONS = {
      hatch: { kind: "levelup", ms: 980, fx: ["\u{1F95A}", "\u2728", "\u{1F416}", "\u{1F389}"], count: 4, say: "\u5B75\u51FA\u6765\u5566\uFF01" },
      feed: { kind: "feed", ms: 900, fx: ["\u{1F34E}", "\u{1F60B}", "\u2728"], count: 3, say: "\u5403\u6389\u4E86\uFF01" },
      bathe: { kind: "bathe", ms: 1050, fx: ["\u{1FAE7}", "\u{1FAE7}", "\u{1F4A7}", "\u2728"], count: 4, say: "\u6D17\u5E72\u51C0\u5566\uFF5E" },
      play: { kind: "play", ms: 900, fx: ["\u{1F3BE}", "\u2B50", "\u{1F4A8}"], count: 3, say: "\u597D\u5F00\u5FC3\uFF01" },
      pet: { kind: "pet", ms: 420, fx: ["\u2764\uFE0F"], count: 1, say: "\u597D\u8212\u670D\u2026" },
      work: { kind: "away", ms: 900, fx: ["\u{1F4BC}", "\u{1F9F1}", "\u{1FA99}"], count: 3, say: "\u51FA\u95E8\u6253\u5DE5\uFF01" },
      study: { kind: "away", ms: 900, fx: ["\u{1F4DA}", "\u270F\uFE0F", "\u{1F9E0}"], count: 3, say: "\u4E0A\u5B66\u53BB\uFF01" },
      trip: { kind: "away", ms: 900, fx: ["\u{1F9F3}", "\u{1F5FA}", "\u2728"], count: 3, say: "\u51FA\u53D1\u65C5\u884C\uFF01" },
      calloff: { kind: "refuse", ms: 520, fx: ["\u{1F4A8}"], count: 1, say: "\u63D0\u524D\u56DE\u6765\u4E86\u2026" },
      buy: { kind: "pet", ms: 620, fx: ["\u{1FA99}", "\u{1F6D2}"], count: 2, say: "\u4E70\u5230\u4E86\uFF01" },
      use: { kind: "pet", ms: 620, fx: ["\u2728"], count: 2, say: "\u7528\u6389\u4E86\u3002" }
    };
    function flash(action) {
      var spec = REACTIONS[action];
      if (spec === void 0) return;
      react(spec.kind, spec.ms);
      burst(spec.fx, spec.count);
      var lines = action === "pet" ? PET_LINES : null;
      showBubble(lines === null ? spec.say : lines[Math.floor(Math.random() * lines.length)], 1600);
    }
    var bubbleTimer = null;
    function showBubble(text, ms) {
      if (bubbleTimer !== null) window.clearTimeout(bubbleTimer);
      bubble.textContent = text;
      bubble.hidden = false;
      bubbleTimer = window.setTimeout(function() {
        bubble.hidden = true;
        bubbleTimer = null;
      }, ms || 2600);
    }
    function showLine(text, replies, onReply) {
      if (replies.length === 0) {
        showBubble(text, 2600);
        return;
      }
      if (bubbleTimer !== null) window.clearTimeout(bubbleTimer);
      bubble.textContent = text;
      var row = el("div", "dp-bubble-replies", "");
      replies.forEach(function(label, index) {
        var answer = el("button", "dp-reply", label);
        answer.type = "button";
        answer.addEventListener("click", function(event) {
          event.stopPropagation();
          bubble.hidden = true;
          if (bubbleTimer !== null) window.clearTimeout(bubbleTimer);
          bubbleTimer = null;
          onReply(index);
        });
        row.appendChild(answer);
      });
      bubble.appendChild(row);
      bubble.hidden = false;
      bubbleTimer = window.setTimeout(function() {
        bubble.hidden = true;
        bubbleTimer = null;
      }, 6e3);
    }
    function toast(text) {
      var node = el("div", "dp-toast", text);
      card.insertBefore(node, card.firstChild);
      window.setTimeout(function() {
        node.remove();
      }, 4800);
    }
    function dispose() {
      if (reactTimer !== null) window.clearTimeout(reactTimer);
      if (bubbleTimer !== null) window.clearTimeout(bubbleTimer);
      reactTimer = null;
      bubbleTimer = null;
    }
    return { react, burst, flash, showBubble, showLine, toast, dispose };
  }

  // src/client/io.js
  function createIo(ctx) {
    var actionSeq = 0;
    async function send(action, extra) {
      if (ctx.busy || ctx.stopped) return;
      if (ctx.view.pig === null && action !== "hatch") return;
      actionSeq += 1;
      ctx.busy = true;
      ctx.flash(action);
      try {
        var body = { action };
        if (extra) for (var k in extra) body[k] = extra[k];
        var res = await fetch(ACT_URL, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        });
        var next = await res.json();
        ctx.render(next);
        if (next && next.ok === false) {
          if (next.reason === "stale-line") return;
          if (next.reason === "silent") return;
          ctx.react("refuse", 520);
          if (next.reason === "no-item") {
            var emptyKind = str(next.kind, "");
            ctx.showBubble(NO_ITEM_LINE[emptyKind] ?? "\u80CC\u5305\u91CC\u6CA1\u6709\u80FD\u7528\u7684\u4E1C\u897F", 3200);
            return;
          }
          if (next.reason === "contract-ineligible") {
            var lacks = (Array.isArray(next.missing) ? next.missing : []).map(function(row) {
              return str(row.label, "") + " " + num(row.have, 0) + "/" + num(row.need, 0);
            }).join(" \xB7 ");
            ctx.showBubble(lacks === "" ? "\u5951\u7EA6\u8FD8\u6CA1\u751F\u6548" : "\u5951\u7EA6\u8FD8\u6CA1\u751F\u6548\uFF0C\u8FD8\u5DEE\uFF1A" + lacks, 3400);
            return;
          }
          var reasons = {
            box: "\u5148\u628A\u7EB8\u76D2\u62C6\u5F00",
            "coronation-ineligible": "\u52A0\u5195\u6761\u4EF6\u8FD8\u6CA1\u9F50",
            "contract-ineligible": "\u5951\u7EA6\u8FD8\u6CA1\u751F\u6548\uFF1A\u6761\u4EF6\u6CA1\u8865\u9F50",
            "needs-contract": "\u8FD9\u4E00\u79CD\u8981\u7B7E\u7EA6\uFF0C\u4E0D\u662F\u52A0\u5195",
            "not-a-contract": "\u8FD9\u4E0D\u662F\u5951\u7EA6",
            already: "\u5B83\u5DF2\u7ECF\u662F\u8FD9\u4E2A\u6837\u5B50\u4E86",
            cooldown: "\u8FD8\u8981\u7B49 " + num(next.wait, 0) + " \u79D2",
            poor: "\u94B1\u4E0D\u591F",
            away: "\u5B83\u5728\u5916\u9762",
            weak: "\u592A\u865A\u5F31\u4E86\uFF0C\u5148\u517B\u597D\u518D\u51FA\u95E8",
            hungry: "\u592A\u997F\u4E86",
            "wrong-medicine": "\u836F\u4E0D\u5BF9\u75C7\uFF0C\u75C5\u60C5\u52A0\u91CD\u4E86\u2026",
            empty: "\u80CC\u5305\u91CC\u6CA1\u6709",
            "not-sick": "\u5B83\u6CA1\u751F\u75C5",
            dead: "\u5B83\u5DF2\u7ECF\u8D70\u4E86\u2026",
            idle: "\u5B83\u6CA1\u5728\u5916\u9762",
            owned: "\u8FD9\u4EF6\u5DF2\u7ECF\u6709\u4E86",
            "low-level": "\u7B49\u7EA7\u4E0D\u591F\uFF08\u8981 Lv." + num(next.need, 0) + "\uFF0C\u73B0\u5728 Lv." + num(next.have, 0) + "\uFF09",
            "not-owned": "\u8FD8\u6CA1\u6709\u8FD9\u4EF6\u4E1C\u897F",
            "not-consumable": "\u8FD9\u4E2A\u662F\u7A7F\u7684\uFF0C\u4E0D\u662F\u7528\u7684",
            "wrong-stage": "\u8FD9\u4E2A\u5B66\u6BB5\u6CA1\u6709\u8FD9\u95E8\u8BFE",
            underqualified: "\u5B83\u8FD8\u6CA1\u8FD9\u4E2A\u672C\u4E8B\uFF0C\u5148\u53BB\u4E0A\u8BFE"
          };
          ctx.showBubble(reasons[next.reason] ?? "\u8FD9\u4E2A\u64CD\u4F5C\u6CA1\u6210", 2400);
        }
      } catch (error) {
        ctx.showBubble("\u64CD\u4F5C\u6CA1\u9001\u5230\u5BBF\u4E3B", 2600);
        ctx.react("refuse", 520);
      } finally {
        ctx.busy = false;
      }
    }
    async function refresh2() {
      if (ctx.stopped) return;
      ctx.fitPanel();
      var startedAt = actionSeq;
      try {
        var res = await fetch(STATE_URL, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        var next = await res.json();
        if (startedAt !== actionSeq) return;
        ctx.render(next);
      } catch (error) {
        if (ctx.stopped) return;
        ctx.showBubble("\u8FDE\u63A5\u4E0D\u4E0A\u5BBF\u4E3B", 4e3);
      }
    }
    return { send, refresh: refresh2 };
  }

  // src/client/layout.js
  function createLayout(ctx) {
    function clampPig() {
      var vw = window.innerWidth || 0;
      var vh = window.innerHeight || 0;
      if (vw <= 0 || vh <= 0) return;
      var pigRect = ctx.pig.getBoundingClientRect ? ctx.pig.getBoundingClientRect() : null;
      var w = (pigRect ? pigRect.width || 0 : 0) + 2 * PIG_PADDING_X;
      var sceneRect = ctx.scene.getBoundingClientRect ? ctx.scene.getBoundingClientRect() : null;
      var h = Math.max(sceneRect ? sceneRect.height || 0 : 0, SCENE_RESERVE);
      var right = Math.min(Math.max(4, ctx.userRight), Math.max(4, vw - w - 4));
      var bottom = Math.min(Math.max(4, ctx.userBottom), Math.max(4, vh - h - 4));
      ctx.host.style.right = Math.round(right) + "px";
      ctx.host.style.bottom = Math.round(bottom) + "px";
    }
    function fitPanel() {
      if (!ctx.isOpen) return;
      var vw = window.innerWidth || 0;
      var vh = window.innerHeight || 0;
      if (vw <= 0 || vh <= 0) return;
      var rect = ctx.scene.getBoundingClientRect();
      var roomAbove = rect.top - PANEL_GAP - PANEL_MARGIN;
      var roomBelow = vh - rect.bottom - PANEL_GAP - PANEL_MARGIN;
      if (roomAbove >= roomBelow) {
        ctx.card.style.top = "auto";
        ctx.card.style.bottom = "calc(100% + " + PANEL_GAP + "px)";
        ctx.card.style.maxHeight = Math.max(PANEL_MIN_HEIGHT, Math.round(roomAbove)) + "px";
      } else {
        ctx.card.style.bottom = "auto";
        ctx.card.style.top = "calc(100% + " + PANEL_GAP + "px)";
        ctx.card.style.maxHeight = Math.max(PANEL_MIN_HEIGHT, Math.round(roomBelow)) + "px";
      }
      var width = Math.min(PANEL_WIDTH, vw - 2 * PANEL_MARGIN);
      ctx.card.style.maxWidth = Math.round(width) + "px";
      var shift = PANEL_MARGIN - (rect.right - width);
      ctx.card.style.right = shift > 0 ? -Math.round(shift) + "px" : "0px";
      var cardLeft = Math.max(rect.right - width, PANEL_MARGIN);
      ctx.hud.style.left = Math.max(9, Math.round(cardLeft - rect.left)) + "px";
    }
    function visibleTabs() {
      return ctx.devMode ? TABS.concat([DEV_TAB]) : TABS;
    }
    function paintBar() {
      while (ctx.bar.firstChild) ctx.bar.removeChild(ctx.bar.firstChild);
      var list = visibleTabs();
      for (var t = 0; t < list.length; t += 1) ctx.buildIcon(list[t]);
      if (ctx.icons[ctx.tab] === void 0 && ctx.tab !== "home") ctx.tab = "home";
      for (var k in ctx.icons) ctx.icons[k].setAttribute("data-active", k === ctx.tab ? "true" : "false");
    }
    function buildIcon(entry) {
      (function(entry2) {
        var btn = button("dp-ico", { "data-tab": entry2.key }, function() {
          if (ctx.host.getAttribute("data-open") !== "true") ctx.setOpen(true);
          ctx.select(entry2.key);
        });
        btn.appendChild(el("span", "dp-ico-e", entry2.emoji));
        btn.appendChild(el("span", null, entry2.label));
        ctx.icons[entry2.key] = btn;
        ctx.bar.appendChild(btn);
      })(entry);
    }
    return { clampPig, fitPanel, visibleTabs, paintBar, buildIcon };
  }

  // src/client/normalize.js
  function normalize(raw) {
    var d = obj(raw);
    var pig = isObj(d.pig) ? d.pig : null;
    var legacy = pig !== null && !("coins" in pig) && !("health" in pig);
    return {
      legacy,
      // Host build version, shown in the debug tab so a stale bundle is
      // visible instead of being guessed at.
      version: str(d.version, ""),
      // Trust the flag when the host sends one. Older hosts did not, and for
      // those "a pig exists" is still the right answer.
      hatched: d.hatched === true || d.hatched === void 0 && pig !== null,
      dead: d.dead === true || pig !== null && num(pig.health, 5) <= 0,
      pig: pig === null ? null : {
        name: str(pig.name, "\u732A\u732A"),
        // The pig is measured in days now; `stage` carries how big it is and
        // what it looks like.
        stage: {
          key: str(obj(pig.stage).key, "piglet"),
          label: str(obj(pig.stage).label, "\u5C0F\u732A"),
          emoji: str(obj(pig.stage).emoji, "\u{1F416}"),
          size: num(obj(pig.stage).size, 56),
          line: str(obj(pig.stage).line, ""),
          art: typeof obj(pig.stage).art === "string" && obj(pig.stage).art !== "" ? obj(pig.stage).art : null,
          faded: obj(pig.stage).faded === true,
          // 加冕后的形态：有没有动作立绘、盖住哪些装扮位置。
          actionArt: obj(pig.stage).actionArt === true,
          hides: arr(obj(pig.stage).hides).map(function(slot) {
            return str(slot, "");
          })
        },
        // Older hosts send no sex; the HUD then simply shows none.
        sex: isObj(pig.sex) ? { key: str(pig.sex.key, ""), label: str(pig.sex.label, ""), symbol: str(pig.sex.symbol, "") } : null,
        ageLabel: str(pig.ageLabel, ""),
        ageForced: pig.ageForced === true,
        daysToNextStage: typeof pig.daysToNextStage === "number" ? pig.daysToNextStage : null,
        soul: pig.soul === true,
        mood: str(pig.mood, "fine"),
        moodEmoji: str(pig.moodEmoji, "\u{1F60A}"),
        moodLabel: str(pig.moodLabel, "\u8FD8\u4E0D\u9519"),
        satiety: Math.round(num(pig.satiety, 0)),
        happiness: Math.round(num(pig.happiness, 0)),
        cleanliness: Math.round(num(pig.cleanliness, 0)),
        health: num(pig.health, 5),
        healthPercent: num(pig.healthPercent, 100),
        coins: num(pig.coins, 0),
        weight: str(pig.weight, "\u2014"),
        xp: num(pig.xp, 0),
        // Level is driven by growth and decides the body (B2).
        level: (function(info) {
          var i = obj(info);
          var t = obj(i.title);
          return {
            level: num(i.level, 1),
            percent: num(i.percent, 0),
            toNext: num(i.toNext, 0),
            maxed: i.maxed === true,
            titleLabel: str(t.label, "\u65B0\u6765\u7684"),
            titleEmoji: str(t.emoji, "\u{1F331}")
          };
        })(pig.levelInfo),
        stageLine: str(pig.stageLine, ""),
        illness: isObj(pig.illness) ? {
          name: str(pig.illness.name, "\u751F\u75C5"),
          cure: str(pig.illness.cure, "\u836F"),
          cureEmoji: str(pig.illness.cureEmoji, "\u{1F48A}"),
          stage: num(pig.illness.stage, 1),
          doctorFee: typeof pig.illness.doctorFee === "number" ? pig.illness.doctorFee : null
        } : null,
        traits: {
          intel: num(obj(pig.traits).intel, 0),
          charm: num(obj(pig.traits).charm, 0),
          strong: num(obj(pig.traits).strong, 0)
        },
        courses: obj(pig.courses),
        // Souvenirs are objects now (rarity + story). An old host sent bare
        // strings, and those must still list rather than turn into [object
        // Object] or vanish.
        souvenirs: arr(pig.souvenirs).map((entry) => {
          if (typeof entry === "string") {
            return { key: entry, emoji: "\u{1F381}", label: entry, rarityLabel: "\u666E\u901A", rarityEmoji: "\u26AA", price: 0, story: "", fromLabel: "" };
          }
          return {
            key: str(obj(entry).key, ""),
            emoji: str(obj(entry).emoji, "\u{1F381}"),
            label: str(obj(entry).label, "\u7EAA\u5FF5\u54C1"),
            rarityLabel: str(obj(entry).rarityLabel, "\u666E\u901A"),
            rarityEmoji: str(obj(entry).rarityEmoji, "\u26AA"),
            price: num(obj(entry).price, 0),
            story: str(obj(entry).story, ""),
            fromLabel: str(obj(entry).fromLabel, "")
          };
        }).filter((entry) => entry.key !== ""),
        memories: arr(pig.memories).filter((m) => typeof m === "string")
      },
      actions: normalizeActions(d.actions),
      jobs: arr(d.jobs).map((job) => ({
        key: str(obj(job).key, ""),
        label: str(obj(job).label, "\u5DE5\u4F5C"),
        emoji: str(obj(job).emoji, "\u{1F4BC}"),
        minutes: num(obj(job).minutes, 0),
        coins: num(obj(job).coins, 0),
        available: obj(job).available === true,
        // What schooling has bought this job.
        traitLabel: str(obj(job).traitLabel, ""),
        traitEmoji: str(obj(job).traitEmoji, ""),
        traitPoints: num(obj(job).traitPoints, 0),
        baseMinutes: num(obj(job).baseMinutes, 0),
        baseCoins: num(obj(job).baseCoins, 0),
        payPercent: num(obj(job).payPercent, 0),
        speedPercent: num(obj(job).speedPercent, 0),
        // An old host has no gate at all, so a missing flag must read as
        // "qualified" — the opposite default would lock every job on upgrade.
        qualified: obj(job).qualified !== false,
        lockText: str(obj(job).lockText, ""),
        level: num(obj(job).level, 1),
        trait: str(obj(job).trait, ""),
        satiety: num(obj(job).satiety, 0),
        cleanliness: num(obj(job).cleanliness, 0),
        requirements: arr(obj(job).requirements).filter(isObj).map((entry) => ({
          text: str(entry.text, ""),
          need: num(entry.need, 0),
          have: num(entry.have, 0),
          kind: str(entry.kind, ""),
          met: entry.met === true
        }))
      })).filter((job) => job.key !== ""),
      // B4: nine subjects, each with its own lesson count and stage.
      subjects: arr(d.subjects).map((sub) => ({
        key: str(obj(sub).key, ""),
        label: str(obj(sub).label, "\u8BFE"),
        emoji: str(obj(sub).emoji, "\u{1F4D8}"),
        traitLabel: str(obj(sub).traitLabel, ""),
        traitEmoji: str(obj(sub).traitEmoji, ""),
        lessons: num(obj(sub).lessons, num(obj(sub).level, 0)),
        stageKey: str(obj(obj(sub).stage).key, ""),
        stageLabel: str(obj(obj(sub).stage).label, ""),
        graduatedLabel: isObj(obj(sub).graduated) ? str(obj(sub).graduated.label, "") : "",
        nextGraduation: typeof obj(sub).nextGraduation === "number" ? obj(sub).nextGraduation : null,
        minutes: num(obj(sub).minutes, 0),
        tuition: num(obj(sub).tuition, 0),
        gain: num(obj(sub).gain, 0),
        secondaryGain: num(obj(sub).secondaryGain, 0),
        available: obj(sub).available === true,
        affordable: obj(sub).affordable !== false
      })).filter((sub) => sub.key !== ""),
      // 兴趣课：学习页里随时能学的一栏，学完加的是既有的三条属性。
      interests: arr(d.interests).map((entry) => ({
        key: str(obj(entry).key, ""),
        label: str(obj(entry).label, "\u5174\u8DA3"),
        emoji: str(obj(entry).emoji, "\u{1F3AF}"),
        traitLabel: str(obj(entry).traitLabel, ""),
        traitEmoji: str(obj(entry).traitEmoji, ""),
        minutes: num(obj(entry).minutes, 0),
        cost: num(obj(entry).cost, 0),
        gain: num(obj(entry).gain, 0),
        blurb: str(obj(entry).blurb, ""),
        times: num(obj(entry).times, 0),
        certificate: str(obj(entry).certificate, ""),
        certificateAfter: num(obj(entry).certificateAfter, 0),
        certified: obj(entry).certified === true,
        available: obj(entry).available === true,
        affordable: obj(entry).affordable === true
      })).filter((entry) => entry.key !== ""),
      stages: arr(d.stages).map((stage) => ({
        key: str(obj(stage).key, ""),
        label: str(obj(stage).label, "\u5B66\u6BB5"),
        emoji: str(obj(stage).emoji, "\u{1F4DA}"),
        minutes: num(obj(stage).minutes, 0),
        tuition: num(obj(stage).tuition, 0),
        gain: num(obj(stage).gain, 0),
        // B4: the lesson numbers this stage covers (upTo null = no end).
        from: num(obj(stage).from, 0),
        upTo: typeof obj(stage).upTo === "number" ? obj(stage).upTo : null,
        // Which courses this stage teaches — empty on an old host, in which
        // case the panel shows every subject rather than none.
        subjects: arr(obj(stage).subjects).filter((key) => typeof key === "string"),
        // The school ladder: a stage with `unlocked === false` is gated behind
        // finishing the previous one, and says by how much.
        unlocked: obj(stage).unlocked !== false,
        progress: isObj(obj(stage).progress) ? {
          done: num(obj(stage).progress.done, 0),
          need: num(obj(stage).progress.need, 0),
          label: str(obj(stage).progress.label, "")
        } : null
      })).filter((stage) => stage.key !== ""),
      trips: arr(d.trips).map((trip) => ({
        key: str(obj(trip).key, ""),
        label: str(obj(trip).label, "\u76EE\u7684\u5730"),
        emoji: str(obj(trip).emoji, "\u{1F9F3}"),
        minutes: num(obj(trip).minutes, 0),
        cost: num(obj(trip).cost, 0),
        happiness: num(obj(trip).happiness, 0),
        // What the destination can bring back — the far trips advertise it.
        souvenirCount: num(obj(trip).souvenirCount, 0),
        bestRarity: str(obj(trip).bestRarity, ""),
        bestRarityEmoji: str(obj(trip).bestRarityEmoji, ""),
        affordable: obj(trip).affordable === true,
        available: obj(trip).available === true
      })).filter((trip) => trip.key !== ""),
      // 家当: owned and worn, never counted. An old host sends none.
      dress: arr(d.dress).map((entry) => ({
        key: str(obj(entry).key, ""),
        label: str(obj(entry).label, "\u88C5\u626E"),
        emoji: str(obj(entry).emoji, "\u{1F455}"),
        price: num(obj(entry).price, 0),
        level: num(obj(entry).level, 1),
        slot: str(obj(entry).slot, ""),
        slotLabel: str(obj(entry).slotLabel, ""),
        blurb: str(obj(entry).blurb, ""),
        owned: obj(entry).owned === true,
        worn: obj(entry).worn === true,
        unlocked: obj(entry).unlocked !== false
      })).filter((entry) => entry.key !== ""),
      shop: arr(d.shop).map((item) => ({
        key: str(obj(item).key, ""),
        label: str(obj(item).label, "\u7269\u54C1"),
        emoji: str(obj(item).emoji, "\u{1F4E6}"),
        price: num(obj(item).price, 0),
        kind: str(obj(item).kind, "food"),
        tier: typeof obj(item).tier === "number" ? obj(item).tier : null,
        // 家当 fields: a dress item is owned (not counted) or waits for a level.
        level: typeof obj(item).level === "number" ? obj(item).level : null,
        owned: obj(item).owned === true,
        worn: obj(item).worn === true,
        unlocked: obj(item).unlocked !== false,
        blurb: str(obj(item).blurb, ""),
        affordable: obj(item).affordable === true,
        needed: obj(item).needed === true
      })).filter((item) => item.key !== ""),
      inventory: obj(d.inventory),
      daily: {
        canSignIn: obj(d.daily).canSignIn === true,
        signInDay: num(obj(d.daily).signInDay, 1),
        signInTotal: num(obj(d.daily).signInTotal, 0),
        cycle: num(obj(d.daily).cycle, 12),
        unclaimed: num(obj(d.daily).unclaimed, 0),
        onlineMinutes: num(obj(d.daily).onlineMinutes, 0)
      },
      // 新到旧；老宿主没有 diary 时是空数组，面板不显示这一栏。
      diary: arr(d.diary).map((entry) => ({
        day: str(obj(entry).day, ""),
        text: str(obj(entry).text, "")
      })).filter((entry) => entry.day !== "" && entry.text !== ""),
      // Which items each care action could spend right now.
      care: (() => {
        const out = {};
        const source = obj(d.care);
        for (const action of ["feed", "bathe", "play"]) {
          out[action] = arr(source[action]).map((entry) => ({
            key: str(obj(entry).key, ""),
            label: str(obj(entry).label, "\u7269\u54C1"),
            emoji: str(obj(entry).emoji, "\u{1F4E6}"),
            default: obj(entry).default === true,
            count: typeof obj(entry).count === "number" ? obj(entry).count : null,
            satiety: num(obj(entry).satiety, 0),
            happiness: num(obj(entry).happiness, 0),
            cleanliness: num(obj(entry).cleanliness, 0)
          })).filter((entry) => entry.key !== "");
        }
        return out;
      })(),
      activity: isObj(d.activity) ? {
        kind: str(d.activity.kind, "work"),
        key: str(d.activity.key, ""),
        label: str(d.activity.label, "\u5916\u9762"),
        emoji: str(d.activity.emoji, "\u{1F4BC}"),
        secondsLeft: num(d.activity.secondsLeft, 0),
        progress: num(d.activity.progress, 0)
      } : null,
      canGoOut: d.canGoOut === true,
      timeScale: num(d.timeScale, 1),
      boxStage: isObj(d.boxStage) ? {
        key: str(d.boxStage.key, "box"),
        label: str(d.boxStage.label, "\u7EB8\u76D2"),
        emoji: str(d.boxStage.emoji, "\u{1F4E6}"),
        size: num(d.boxStage.size, 58)
      } : { key: "box", label: "\u7EB8\u76D2", emoji: "\u{1F4E6}", size: 58 },
      awayBlocked: typeof d.awayBlocked === "string" ? d.awayBlocked : null,
      // B9: the villager card. Older hosts send none, and the card says so.
      profile: isObj(d.profile) ? {
        personality: isObj(d.profile.personality) ? { label: str(d.profile.personality.label, ""), emoji: str(d.profile.personality.emoji, "") } : null,
        catchphrase: str(d.profile.catchphrase, ""),
        motto: str(d.profile.motto, ""),
        birthday: str(d.profile.birthday, ""),
        zodiac: isObj(d.profile.zodiac) ? { label: str(d.profile.zodiac.label, ""), emoji: str(d.profile.zodiac.emoji, "") } : null,
        counts: {
          days: num(obj(d.profile.counts).days, 0),
          certificates: num(obj(d.profile.counts).certificates, 0),
          souvenirs: num(obj(d.profile.counts).souvenirs, 0),
          graduations: num(obj(d.profile.counts).graduations, 0)
        }
      } : null,
      // 形态: the forms and how close the pig is. Older hosts send none, and older
      // hosts also have no `via` — treat those as 加冕, which is what they were.
      forms: isObj(d.forms) ? {
        current: typeof d.forms.current === "string" ? d.forms.current : null,
        forms: arr(d.forms.forms).map(function(raw2) {
          var f = obj(raw2);
          return {
            key: str(f.key, ""),
            via: str(f.via, "coronation"),
            label: str(f.label, ""),
            emoji: str(f.emoji, "\u{1F451}"),
            art: str(f.art, ""),
            current: f.current === true,
            ready: f.ready === true,
            requirements: arr(f.requirements).map(function(row) {
              var r = obj(row);
              return { key: str(r.key, ""), label: str(r.label, ""), have: num(r.have, 0), need: num(r.need, 0), met: r.met === true };
            })
          };
        })
      } : null,
      // B6: what the pig calls its owner, and 免打扰. Older hosts send neither.
      dialogue: {
        ownerName: str(obj(d.dialogue).ownerName, "\u4E3B\u4EBA"),
        quiet: obj(d.dialogue).quiet === true
      },
      pending: arr(d.pending).filter((e) => isObj(e) && typeof e.at === "number").map((e) => ({
        id: num(e.id, 0),
        kind: str(e.kind, ""),
        text: str(e.text, ""),
        at: e.at,
        replies: arr(e.replies).filter((label) => typeof label === "string")
      })),
      maxHealth: num(d.maxHealth, 5)
    };
  }
  function normalizeActions(raw) {
    var source = obj(raw);
    var out = {};
    for (var i = 0; i < MODES.length; i += 1) {
      var key = MODES[i];
      var entry = obj(source[key]);
      out[key] = {
        ready: entry.ready !== false,
        waitSeconds: num(entry.waitSeconds, 0),
        blocked: typeof entry.blocked === "string" ? entry.blocked : null
      };
    }
    return out;
  }

  // src/client/storage.js
  function readStore(key) {
    try {
      var value = window.localStorage.getItem(key);
      return value !== null ? value : window.localStorage.getItem(key.replace(/^dsh-piggy:/, "dsh-pig:"));
    } catch (error) {
      return null;
    }
  }
  function writeStore(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
    }
  }

  // src/client/tabs/card.js
  var LIMITS = { catchphrase: 6, motto: 24 };
  function renderCardTab(ui) {
    var p = ui.view.pig;
    var profile = ui.view.profile;
    if (p === null) return;
    if (profile === null) {
      ui.content.appendChild(el("div", "dp-empty", "\u91CD\u542F dsh \u4E4B\u540E\u624D\u6709\u5C45\u6C11\u5361"));
      return;
    }
    var card = el("div", "dp-vcard");
    card.setAttribute("data-sex", p.sex !== null ? p.sex.key : "none");
    var top = el("div", "dp-vcard-top");
    var avatar = el("div", "dp-vcard-avatar");
    if (p.stage.art !== null) {
      var img = (
        /** @type {HTMLImageElement} */
        el("img", "dp-vcard-img")
      );
      img.src = ART_URL + p.stage.art + ".svg";
      img.alt = "";
      avatar.appendChild(img);
    } else {
      avatar.appendChild(el("span", "dp-vcard-e", p.stage.emoji));
    }
    top.appendChild(avatar);
    var who = el("div", "dp-vcard-who");
    who.appendChild(el("b", "dp-vcard-name", p.name + (p.sex !== null ? " " + p.sex.symbol : "")));
    who.appendChild(el("span", "dp-vcard-sub", "Lv." + p.level.level + " " + p.level.titleEmoji + p.level.titleLabel));
    who.appendChild(el("span", "dp-vcard-sub", p.stage.label));
    top.appendChild(who);
    card.appendChild(top);
    card.appendChild(field("\u751F\u65E5", profile.birthday));
    if (profile.zodiac !== null) card.appendChild(field("\u661F\u5EA7", profile.zodiac.emoji + " " + profile.zodiac.label));
    if (profile.personality !== null) card.appendChild(field("\u6027\u683C", profile.personality.emoji + " " + profile.personality.label));
    var forms = ui.view.forms;
    var worn = forms === null ? null : forms.forms.find(function(f) {
      return f.current;
    }) || null;
    if (worn !== null) card.appendChild(field("\u5F62\u6001", worn.emoji + " " + worn.label));
    card.appendChild(editableField(ui, "catchphrase", "\u53E3\u5934\u7985", profile.catchphrase));
    card.appendChild(editableField(ui, "motto", "\u7B7E\u540D", profile.motto));
    var c = profile.counts;
    card.appendChild(el(
      "div",
      "dp-vcard-foot",
      "\u517B\u4E86 " + c.days + " \u5929 \xB7 \u8BC1\u4E66 " + c.certificates + " \xB7 \u7EAA\u5FF5\u54C1 " + c.souvenirs + " \xB7 \u6BD5\u4E1A " + c.graduations
    ));
    ui.content.appendChild(card);
  }
  function field(label, value) {
    var row = el("div", "dp-vcard-row");
    row.appendChild(el("span", "dp-vcard-label", label + "\uFF1A"));
    row.appendChild(el("span", "dp-vcard-value", value));
    return row;
  }
  function editableField(ui, key, label, value) {
    var editing = ui.cardEdit !== null && ui.cardEdit.field === key;
    var row = el("div", "dp-vcard-row" + (key === "motto" ? " dp-vcard-motto-row" : ""));
    row.appendChild(el("span", "dp-vcard-label", label + "\uFF1A"));
    if (editing) {
      var input = (
        /** @type {HTMLInputElement} */
        el("input", "dp-input dp-vcard-input")
      );
      input.value = ui.cardEdit.draft;
      input.maxLength = LIMITS[key];
      input.setAttribute("data-card-input", key);
      input.addEventListener("input", function() {
        ui.cardEdit = { field: key, draft: input.value };
      });
      var save = button("dp-mini", { "data-card-save": key }, function() {
        var text = (ui.cardEdit === null ? "" : ui.cardEdit.draft).trim();
        ui.cardEdit = null;
        if (text !== "") ui.send(key, { text });
        ui.renderContent();
      });
      save.textContent = "\u597D";
      var cancel = button("dp-mini dp-mini-plain", { "data-card-cancel": key }, function() {
        ui.cardEdit = null;
        ui.renderContent();
      });
      cancel.textContent = "\u7B97\u4E86";
      row.appendChild(input);
      row.appendChild(save);
      row.appendChild(cancel);
      return row;
    }
    row.appendChild(el("span", key === "motto" ? "dp-vcard-value dp-vcard-motto" : "dp-vcard-value", key === "motto" ? "\u300C" + value + "\u300D" : value));
    var pencil = button("dp-vcard-edit", { "data-card-edit": key }, function() {
      ui.cardEdit = { field: key, draft: value };
      ui.renderContent();
    });
    pencil.textContent = "\u270F\uFE0F";
    pencil.title = "\u6539" + label;
    row.appendChild(pencil);
    return row;
  }

  // src/client/tabs/crown.js
  function renderCrownTab(ui) {
    var forms = ui.view.forms;
    if (forms === null) {
      ui.content.appendChild(el("div", "dp-empty", "\u91CD\u542F dsh \u4E4B\u540E\u624D\u6709\u52A0\u5195"));
      return;
    }
    if (ui.view.dead) ui.content.appendChild(el("div", "dp-empty", "\u5B83\u8D70\u4E86\uFF0C\u6551\u56DE\u6765\u624D\u80FD\u52A0\u5195"));
    for (var f = 0; f < forms.forms.length; f += 1) {
      if (forms.forms[f].via !== "coronation") continue;
      ui.content.appendChild(formBlock(ui, forms.forms[f]));
    }
  }
  function formBlock(ui, form) {
    var box = el("div", form.current ? "dp-crown dp-crown-now" : "dp-crown");
    box.setAttribute("data-form", form.key);
    var top = el("div", "dp-crown-top");
    var pic = el("div", "dp-crown-pic");
    if (form.art !== "") {
      var img = (
        /** @type {HTMLImageElement} */
        el("img", "dp-crown-img")
      );
      img.src = ART_URL + form.art + ".svg";
      img.alt = "";
      pic.appendChild(img);
    } else {
      pic.appendChild(el("span", null, form.emoji));
    }
    top.appendChild(pic);
    var side = el("div", "dp-crown-side");
    side.appendChild(el("div", "dp-crown-head", form.emoji + " " + form.label));
    if (form.current) {
      side.appendChild(el("div", "dp-crown-done", "\u2713 \u5F53\u524D\u5F62\u6001"));
    } else {
      var chips = el("div", "dp-crown-reqs");
      for (var r = 0; r < form.requirements.length; r += 1) {
        var row = form.requirements[r];
        chips.appendChild(el(
          "span",
          row.met ? "dp-crown-req dp-crown-ok" : "dp-crown-req",
          (row.met ? "\u2713 " : "\u2717 ") + row.label + " " + Math.min(row.have, row.need) + "/" + row.need
        ));
      }
      side.appendChild(chips);
    }
    top.appendChild(side);
    box.appendChild(top);
    if (!form.current) {
      var go = button("dp-btn dp-btn-wide", { "data-crown": form.key }, function() {
        ui.send("crown", { form: form.key });
      });
      go.textContent = form.ready ? "\u{1F451} \u52A0\u5195" : "\u6761\u4EF6\u9F50\u4E86\u5C31\u80FD\u52A0\u5195";
      go.disabled = !form.ready;
      box.appendChild(go);
    }
    return box;
  }

  // src/client/tabs/home.js
  var APP_COLOR = {
    status: "green",
    card: "pink",
    crown: "purple",
    study: "yellow",
    work: "orange",
    shop: "red",
    travel: "blue",
    bag: "teal",
    update: "lime",
    quit: "peach",
    dev: "brown"
  };
  function renderHome(ui, apps) {
    var p = ui.view.pig;
    var head = el("div", "dp-title");
    head.appendChild(el("b", null, p.name + (p.sex !== null ? " " + p.sex.symbol : "") + " Lv." + p.level.level));
    head.appendChild(el("span", null, "\u{1FA99} " + p.coins));
    ui.content.appendChild(head);
    var grid = tileGrid();
    for (var i = 0; i < apps.length; i += 1) {
      (function(app) {
        grid.appendChild(tile({
          emoji: app.emoji,
          label: app.label,
          color: APP_COLOR[app.key] ?? "blue",
          tag: alertFor(ui, app.key),
          data: { "data-app": app.key },
          onPick: function() {
            ui.select(app.key);
          }
        }));
      })(apps[i]);
    }
    ui.content.appendChild(grid);
  }
  function alertFor(ui, key) {
    var p = ui.view.pig;
    if (key === "status") {
      if (ui.view.dead) return "\u8D70\u4E86";
      if (p.illness !== null) return "\u751F\u75C5";
      if (ui.view.activity !== null) return "\u5728\u5916\u9762";
      return "";
    }
    var icon = ui.icons[key];
    return icon !== void 0 && icon.getAttribute("data-alert") === "true" ? "!" : "";
  }
  function appHeader(ui, app, info) {
    var row = el("div", "dp-drill dp-app-head");
    var back = el("button", "dp-drill-back");
    back.setAttribute("data-home", "true");
    back.textContent = "\u2039";
    back.addEventListener("click", function(event) {
      if (event && typeof event.stopPropagation === "function") event.stopPropagation();
      ui.select("home");
    });
    row.appendChild(back);
    row.appendChild(el("b", "dp-drill-title", app.emoji + " " + app.label));
    if (info) row.appendChild(el("span", "dp-drill-info", info));
    ui.content.appendChild(row);
  }

  // src/client/tabs/update.js
  var state = {
    current: null,
    list: null,
    error: null,
    loading: false,
    pick: null,
    busy: null,
    fraction: 0,
    message: null,
    listening: false
  };
  function updatesBridge() {
    var shell = (
      /** @type {any} */
      window.piggyShell
    );
    return shell && shell.updates ? shell : null;
  }
  function refresh(ui) {
    var shell = updatesBridge();
    if (shell === null || state.loading) return;
    state.loading = true;
    state.error = null;
    if (!state.listening) {
      state.listening = true;
      shell.updates.onProgress(function(fraction) {
        state.fraction = fraction;
        ui.renderContent();
      });
    }
    Promise.all([shell.updates.current(), shell.updates.list()]).then(function(got) {
      state.current = got[0];
      if (got[1] && got[1].ok) state.list = got[1].releases;
      else state.error = got[1] && got[1].reason || "\u6CA1\u95EE\u5230";
    }, function() {
      state.error = "\u6CA1\u95EE\u5230";
    }).then(function() {
      state.loading = false;
      ui.renderContent();
    });
  }
  function install(ui, version) {
    var shell = updatesBridge();
    if (shell === null) return;
    state.busy = version;
    state.fraction = 0;
    state.message = null;
    ui.renderContent();
    shell.updates.install(version).then(function(result) {
      state.message = result.ok ? "\u6362\u597D\u4E86\uFF0C\u732A\u9A6C\u4E0A\u56DE\u6765\u2026" : result.reason;
      if (!result.ok) state.busy = null;
      ui.renderContent();
    });
  }
  function rollback(ui) {
    var shell = updatesBridge();
    if (shell === null) return;
    state.busy = "rollback";
    ui.renderContent();
    shell.updates.rollback().then(function(result) {
      state.message = result.ok ? "\u56DE\u53BB\u4E86\uFF0C\u732A\u9A6C\u4E0A\u56DE\u6765\u2026" : result.reason;
      if (!result.ok) state.busy = null;
      ui.renderContent();
    });
  }
  function renderUpdateTab(ui) {
    if (updatesBridge() === null) {
      ui.content.appendChild(el("div", "dp-empty", "\u684C\u9762\u7248\u624D\u6709\u8FD9\u4E2A"));
      return;
    }
    if (state.current === null && state.list === null && state.error === null) refresh(ui);
    var cur = state.current;
    var head = el("div", "dp-pick dp-tile-card dp-update-now");
    head.appendChild(el("div", "dp-pick-head", cur === null ? "\u6B63\u5728\u770B\u73B0\u5728\u7684\u7248\u672C\u2026" : "\u73B0\u5728 v" + cur.version + (cur.bundled ? "\uFF08\u5B89\u88C5\u5305\u81EA\u5E26\uFF09" : "")));
    if (cur !== null) head.appendChild(el("div", "dp-dim", "\u5B89\u88C5\u5305 " + cur.shell));
    if (state.message !== null) head.appendChild(el("div", "dp-req", state.message));
    if (state.busy !== null && state.message === null) {
      head.appendChild(el("div", "dp-dim", state.busy === "rollback" ? "\u6B63\u5728\u6362\u56DE\u53BB\u2026" : "\u4E0B\u8F7D\u4E2D " + Math.round(state.fraction * 100) + "%"));
    }
    var latest = state.list === null ? null : state.list.find(function(r) {
      return r.blocked === null && !r.prerelease;
    }) || null;
    if (latest !== null && cur !== null && !latest.current) {
      var up = button("dp-btn dp-btn-wide", { "data-update-latest": latest.version }, function() {
        install(ui, latest.version);
      });
      up.textContent = "\u2B06\uFE0F \u66F4\u65B0\u5230\u6700\u65B0 v" + latest.version;
      up.disabled = state.busy !== null;
      head.appendChild(up);
    } else if (latest !== null) {
      head.appendChild(el("div", "dp-req dp-req-ok", "\u2713 \u5DF2\u7ECF\u662F\u6700\u65B0"));
    }
    ui.content.appendChild(head);
    if (state.loading && state.list === null) ui.content.appendChild(el("div", "dp-empty", "\u6B63\u5728\u95EE GitHub\u2026"));
    if (state.error !== null) {
      ui.content.appendChild(el("div", "dp-empty", state.error));
      var again = button("dp-btn dp-btn-wide", { "data-update-retry": "" }, function() {
        refresh(ui);
      });
      again.textContent = "\u518D\u8BD5\u4E00\u6B21";
      ui.content.appendChild(again);
    }
    if (state.list !== null) renderList(ui, state.list);
    if (cur !== null && cur.previous !== null) {
      var back = button("dp-btn dp-btn-wide dp-update-back", { "data-update-rollback": "" }, function() {
        rollback(ui);
      });
      back.textContent = "\u21A9\uFE0F \u56DE\u5230\u4E0A\u4E00\u4E2A\u7248\u672C v" + cur.previous;
      back.disabled = state.busy !== null;
      ui.content.appendChild(back);
    }
  }
  function renderList(ui, list) {
    if (list.length === 0) {
      ui.content.appendChild(el("div", "dp-empty", "GitHub \u4E0A\u8FD8\u6CA1\u6709\u80FD\u70ED\u66F4\u65B0\u7684\u7248\u672C"));
      return;
    }
    var grid = tileGrid();
    var picked = null;
    for (var i = 0; i < list.length; i += 1) {
      (function(release, first) {
        var active = state.pick === release.version;
        if (active) picked = release;
        grid.appendChild(tile({
          emoji: release.current ? "\u{1F416}" : "\u{1F4E6}",
          label: "v" + release.version,
          color: "lime",
          soft: true,
          active,
          note: release.date,
          badge: first && release.blocked === null ? "\u65B0" : "",
          tag: release.current ? "\u5728\u7528" : release.blocked !== null ? "\u{1F512}" : "",
          dim: release.blocked !== null,
          data: { "data-release": release.version },
          onPick: function() {
            state.pick = active ? null : release.version;
            ui.renderContent();
          }
        }));
      })(list[i], i === 0);
    }
    ui.content.appendChild(grid);
    if (picked !== null) ui.content.appendChild(details(ui, picked));
  }
  function details(ui, release) {
    var box = el("div", "dp-pick dp-tile-card dp-update-detail");
    box.appendChild(el("div", "dp-pick-head", "v" + release.version + (release.date ? " \xB7 " + release.date : "") + (release.prerelease ? " \xB7 \u9884\u89C8\u7248" : "")));
    if (release.notes) box.appendChild(el("div", "dp-update-notes", release.notes));
    var go = button("dp-btn dp-btn-wide", { "data-update-install": release.version }, function() {
      if (release.blocked === "shell") updatesBridge().openPage(release.page);
      else install(ui, release.version);
    });
    if (release.current) {
      go.textContent = "\u6B63\u5728\u7528\u8FD9\u4E2A";
      go.disabled = true;
    } else if (release.blocked === "shell") {
      box.appendChild(el("div", "dp-req", "\u2717 \u8981\u5148\u88C5 " + release.minShell + " \u4EE5\u4E0A\u7684\u5B89\u88C5\u5305"));
      go.textContent = "\u53BB\u4E0B\u8F7D\u65B0\u5B89\u88C5\u5305";
    } else if (release.blocked === "save") {
      box.appendChild(el("div", "dp-req", "\u2717 \u5B58\u6863\u592A\u65B0\uFF0C\u8FD9\u4E2A\u7248\u672C\u8BFB\u4E0D\u4E86"));
      go.textContent = "\u6362\u4E0D\u4E86";
      go.disabled = true;
    } else {
      go.textContent = "\u6362\u5230\u8FD9\u4E2A\u7248\u672C";
      go.disabled = state.busy !== null;
    }
    box.appendChild(go);
    return box;
  }

  // src/client/panel.js
  var URGENT_KINDS = ["sick", "worse", "death", "cured", "revived"];
  function createPanel(ctx) {
    var AWAY_LINE = {
      work: "\u5728\u5FD9",
      study: "\u5728\u5FF5\u4E66",
      trip: "\u5728\u8DEF\u4E0A"
    };
    function setOpen(next) {
      ctx.isOpen = next;
      ctx.host.setAttribute("data-open", next ? "true" : "false");
      ctx.card.hidden = !next;
      ctx.hud.hidden = !next;
      if (!next) ctx.bubble.hidden = true;
      writeStore(OPEN_KEY, next ? "true" : "false");
      if (next) {
        renderContent();
        ctx.fitPanel();
      } else {
        ctx.card.style.right = "";
        ctx.card.style.top = "auto";
        ctx.card.style.bottom = "";
        ctx.card.style.maxHeight = "";
        ctx.card.style.maxWidth = "";
      }
    }
    function select(next) {
      if (next === "quit") {
        var desk = updatesBridge();
        if (desk !== null && desk.quit) desk.quit();
        return;
      }
      ctx.tab = next;
      ctx.picker = null;
      if (next in ctx.drill) {
        ctx.drill[next] = null;
        ctx.drill.pick = null;
      }
      renderContent();
      for (var k in ctx.icons) ctx.icons[k].setAttribute("data-active", k === ctx.tab ? "true" : "false");
    }
    function renderContent() {
      var scrollTop = ctx.content.scrollTop;
      paintContent();
      ctx.content.scrollTop = scrollTop;
    }
    function paintContent() {
      ctx.content.textContent = "";
      for (var k = 0; k < TABS.length; k += 1) {
        ctx.icons[TABS[k].key].setAttribute("data-active", TABS[k].key === ctx.tab ? "true" : "false");
      }
      if (ctx.host.getAttribute("data-open") !== "true") return;
      if (ctx.view.legacy) {
        var legacy = el("div", "dp-alert dp-legacy");
        legacy.appendChild(el("b", null, "\u26A0\uFE0F \u5BBF\u4E3B\u662F\u65E7\u7248\u672C"));
        legacy.appendChild(el("div", null, "\u91D1\u5E01\u3001\u5065\u5EB7\u3001\u6253\u5DE5\u3001\u5546\u5E97\u8FD9\u4E9B\u662F\u65B0\u589E\u7684\uFF0C\u91CD\u542F dsh\uFF08\u4E0D\u662F\u5237\u65B0\u9875\u9762\uFF09\u4E4B\u540E\u624D\u4F1A\u51FA\u73B0\u3002"));
        ctx.content.appendChild(legacy);
      }
      if (ctx.view.pig === null) {
        ctx.content.appendChild(el("div", "dp-empty", "\u95E8\u53E3\u653E\u7740\u4E00\u4E2A\u7EB8\u76D2\uFF0C\u91CC\u9762\u7AB8\u7AB8\u7AA3\u7AA3 \u{1F4E6}"));
        var grid = el("div", "dp-actions");
        var hatch = button("dp-btn dp-btn-wide", { "data-action": "hatch" }, function() {
          ctx.send("hatch");
        });
        hatch.appendChild(el("span", null, "\u{1F95A}"));
        hatch.appendChild(el("span", null, "\u62C6\u5F00\u7EB8\u76D2"));
        grid.appendChild(hatch);
        ctx.content.appendChild(grid);
        return;
      }
      var shell = updatesBridge();
      var apps = TABS.concat(shell !== null ? [UPDATE_TAB] : [], shell !== null && shell.quit ? [QUIT_TAB] : [], ctx.devMode ? [DEV_TAB] : []);
      if (ctx.tab === "home") {
        renderHome(ctx, apps);
        ctx.fitPanel();
        return;
      }
      var drilled = ctx.tab in ctx.drill && ctx.drill[ctx.tab] !== null;
      var app = apps.find(function(entry) {
        return entry.key === ctx.tab;
      });
      if (app !== void 0 && !drilled) appHeader(ctx, app, ctx.tab === "shop" ? "\u{1FA99} " + ctx.view.pig.coins : "");
      if (ctx.tab === "status") renderStatusTab(ctx);
      else if (ctx.tab === "card") renderCardTab(ctx);
      else if (ctx.tab === "crown") renderCrownTab(ctx);
      else if (ctx.tab === "study") renderStudyTab(ctx);
      else if (ctx.tab === "work") renderWorkTab(ctx);
      else if (ctx.tab === "shop") renderShopTab(ctx);
      else if (ctx.tab === "travel") renderTravelTab(ctx);
      else if (ctx.tab === "dev") renderDevTab(ctx);
      else if (ctx.tab === "update") renderUpdateTab(ctx);
      else renderBagTab(ctx);
      ctx.fitPanel();
    }
    function render(next) {
      ctx.view = normalize(next);
      var stageEntry = null;
      var firstOpen = null;
      for (var s = 0; s < ctx.view.stages.length; s += 1) {
        var entry = ctx.view.stages[s];
        if (entry.unlocked !== false && firstOpen === null) firstOpen = entry.key;
        if (entry.key === ctx.stage) stageEntry = entry;
      }
      if (!ctx.stagePicked && firstOpen !== null && (stageEntry === null || stageEntry.unlocked === false)) ctx.stage = firstOpen;
      ctx.host.setAttribute("data-dead", ctx.view.dead ? "true" : "false");
      ctx.host.setAttribute("data-open", ctx.isOpen ? "true" : "false");
      ctx.host.setAttribute("data-dev", ctx.devMode ? "true" : "false");
      ctx.host.setAttribute("data-away", ctx.view.activity === null ? "false" : ctx.view.activity.kind);
      if (ctx.view.activity === null) {
        ctx.work.hidden = true;
      } else {
        ctx.work.hidden = false;
        ctx.prop.textContent = ctx.view.activity.emoji;
        ctx.progressFill.style.width = ctx.view.activity.progress + "%";
        ctx.work.setAttribute("data-kind", ctx.view.activity.kind);
        ctx.work.title = (AWAY_LINE[ctx.view.activity.kind] ?? "\u5728\u5916\u9762") + "\uFF1A" + ctx.view.activity.label;
      }
      if (ctx.view.hatched !== true) {
        ctx.pigArt.hidden = true;
        ctx.pigArt.removeAttribute("src");
        ctx.pigEmoji.hidden = false;
        ctx.pigEmoji.textContent = ctx.view.boxStage.emoji;
        ctx.pig.removeAttribute("data-art");
        ctx.pig.setAttribute("data-mood", "box");
        ctx.host.style.setProperty("--pig-size", ctx.view.boxStage.size + "px");
        ctx.soul.hidden = true;
        ctx.host.setAttribute("data-soul", "false");
        ctx.host.setAttribute("data-faded", "false");
        ctx.host.setAttribute("data-unhatched", "true");
        ctx.pokeHint.hidden = false;
        ctx.hudName.textContent = "\u4E00\u4E2A" + ctx.view.boxStage.label;
        ctx.hudCoins.textContent = "\u70B9\u5F00\u62C6\u5F00\u5B83";
        ctx.hudHealth.textContent = "";
        ctx.lastStage = null;
      } else {
        const pigStage = ctx.view.pig.stage;
        if (pigStage.art !== null) {
          ctx.pigArt.hidden = false;
          ctx.pigEmoji.hidden = true;
          ctx.pig.setAttribute("data-art", pigStage.art);
          ctx.pig.setAttribute("data-art-actions", pigStage.actionArt ? "true" : "false");
          ctx.host.setAttribute("data-art-actions", pigStage.actionArt ? "true" : "false");
          ctx.pig.setAttribute("data-activity", ctx.view.activity === null ? "" : ctx.view.activity.kind);
          syncPigArt(ctx.pig, ctx.pigArt);
        } else {
          ctx.pigArt.hidden = true;
          ctx.pigArt.removeAttribute("src");
          ctx.pigEmoji.hidden = false;
          ctx.pigEmoji.textContent = pigStage.emoji;
          ctx.pig.removeAttribute("data-art");
          ctx.pig.removeAttribute("data-art-actions");
          ctx.host.removeAttribute("data-art-actions");
        }
        ctx.host.style.setProperty("--pig-size", pigStage.size + "px");
        ctx.pig.setAttribute("data-mood", ctx.view.pig.mood);
        ctx.host.setAttribute("data-soul", ctx.view.pig.soul ? "true" : "false");
        ctx.host.setAttribute("data-faded", pigStage.faded ? "true" : "false");
        ctx.host.setAttribute("data-unhatched", "false");
        ctx.pokeHint.hidden = true;
        ctx.soul.hidden = ctx.view.pig.soul !== true;
        ctx.pig.setAttribute("data-stage", pigStage.key);
        ctx.dressSlots.textContent = "";
        for (var wd = 0; wd < ctx.view.dress.length; wd += 1) {
          var piece = ctx.view.dress[wd];
          if (!piece.worn || piece.slot === "") continue;
          if (pigStage.hides.indexOf(piece.slot) >= 0) continue;
          var node = el("span", "dp-slot", piece.emoji);
          node.setAttribute("data-slot", piece.slot);
          ctx.dressSlots.appendChild(node);
        }
        ctx.hudName.textContent = ctx.view.pig.name + (ctx.view.pig.sex !== null ? " " + ctx.view.pig.sex.symbol : "") + " Lv." + ctx.view.pig.level.level + " \xB7 " + pigStage.label + (ctx.view.pig.ageLabel ? " \xB7 " + ctx.view.pig.ageLabel : "") + (ctx.view.pig.ageForced ? " \u{1F527}" : "");
        ctx.hudCoins.textContent = "\u{1FA99} " + ctx.view.pig.coins;
        ctx.hudHealth.textContent = "\u{1F49A} " + ctx.view.pig.health + "/" + ctx.view.maxHealth;
        if (ctx.lastStage !== null && pigStage.key !== ctx.lastStage) {
          ctx.react("levelup", 950);
          ctx.burst(["\u2728", "\u{1F389}", "\u2B50"], 4);
          ctx.showBubble("\u6211\u957F\u5927\u5566\uFF01" + pigStage.emoji, 2600);
        }
        ctx.lastStage = pigStage.key;
      }
      var daily = ctx.view.daily;
      var dailyAction = daily.canSignIn ? "signIn" : daily.unclaimed > 0 ? "openGift" : null;
      ctx.dailyHint.hidden = dailyAction === null || ctx.view.pig === null;
      if (dailyAction !== null) {
        ctx.dailyHint.textContent = dailyAction === "signIn" ? "\u{1F4C5}" : "\u{1F381}";
        ctx.dailyHint.title = dailyAction === "signIn" ? "\u7B7E\u5230\u7B2C " + daily.signInDay + "/" + daily.cycle + " \u5929" : "\u6709 " + daily.unclaimed + " \u4E2A\u5728\u7EBF\u793C\u5305";
        ctx.dailyHint.setAttribute("data-action", dailyAction);
      }
      var studyStage = null;
      for (var st = 0; st < ctx.view.stages.length; st += 1) {
        if (ctx.view.stages[st].key === ctx.stage) studyStage = ctx.view.stages[st];
      }
      var studyOpen = ctx.view.canGoOut && (studyStage === null || studyStage.unlocked !== false);
      var hasCourse = studyOpen && ctx.view.subjects.some(function(subject) {
        var onStage = studyStage === null || studyStage.subjects.length === 0 || studyStage.subjects.indexOf(subject.key) >= 0;
        return onStage && subject.affordable;
      });
      ctx.icons.study.setAttribute("data-alert", hasCourse ? "true" : "false");
      ctx.icons.shop.setAttribute("data-alert", ctx.view.pig !== null && ctx.view.pig.illness !== null ? "true" : "false");
      ctx.icons.crown.setAttribute("data-alert", ctx.view.forms !== null && ctx.view.forms.forms.some(function(f) {
        return f.ready;
      }) ? "true" : "false");
      ctx.icons.travel.setAttribute("data-alert", ctx.view.pig !== null && ctx.view.pig.coins >= 400 ? "true" : "false");
      for (var i = 0; i < ctx.view.pending.length; i += 1) {
        var event = ctx.view.pending[i];
        if (event.id > 0 ? event.id <= ctx.lastPendingId : event.at <= ctx.lastPendingAt) continue;
        if (event.id > 0) ctx.lastPendingId = event.id;
        ctx.lastPendingAt = Math.max(ctx.lastPendingAt, event.at);
        if (event.kind === "line") {
          showPigLine(event);
          continue;
        }
        if (ctx.view.dialogue.quiet && URGENT_KINDS.indexOf(event.kind) < 0) continue;
        ctx.toast(str(event.text, "\u732A\u6709\u65B0\u6D88\u606F"));
        if (event.kind === "coronation") {
          ctx.react("levelup", 950);
          ctx.burst(["\u{1F451}", "\u2728"], 3);
        } else if (event.kind === "contract") {
          ctx.react("levelup", 950);
          ctx.burst(["\u{1F608}", "\u{1F4DC}"], 3);
        } else if (event.kind === "levelup") {
          ctx.react("levelup", 950);
          ctx.burst(["\u2728", "\u{1F389}"], 3);
        } else if (event.kind === "cured") {
          ctx.react("cure", 900);
          ctx.burst(["\u{1F49A}", "\u2728"], 3);
        } else if (event.kind === "death") ctx.react("refuse", 700);
        else if (event.kind === "work") {
          ctx.react("away", 900);
          ctx.burst(["\u{1FA99}", "\u{1F4B0}"], 3);
        } else if (event.kind === "study") {
          ctx.react("away", 900);
          ctx.burst(["\u{1F4DA}", "\u2728"], 3);
        } else if (event.kind === "trip") {
          ctx.react("away", 900);
          ctx.burst(["\u{1F9F3}", "\u{1F381}"], 3);
        }
      }
      if ((ctx.ownerEdit !== null || ctx.pigNameEdit !== null) && ctx.tab === "status") return;
      if (ctx.cardEdit !== null && ctx.tab === "card") return;
      renderContent();
    }
    function showPigLine(event) {
      var lineId = event.id;
      ctx.showLine(event.text, event.replies, function(index) {
        ctx.send("reply", { line: lineId, index });
      });
    }
    return { setOpen, select, renderContent, render };
  }

  // src/client/scene.js
  function createScene() {
    var font = document.createElement("link");
    font.rel = "stylesheet";
    font.href = "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Noto+Sans+SC:wght@400;500;700&display=swap";
    document.head.appendChild(font);
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    var host = document.createElement("div");
    host.setAttribute(MOUNTED, "");
    var card = el("div", "dp-card");
    var scene = el("div", "dp-scene");
    var hud = el("div", "dp-hud");
    var hudName = el("div", null, "\u732A\u732A");
    var hudCoins = el("div", null, "\u{1FA99} 0");
    var hudHealth = el("div", null, "\u{1F49A} 5/5");
    hud.appendChild(hudName);
    hud.appendChild(hudCoins);
    hud.appendChild(hudHealth);
    scene.appendChild(hud);
    var bubble = el("div", "dp-bubble", "");
    bubble.hidden = true;
    scene.appendChild(bubble);
    var work = el("div", "dp-work");
    var prop = el("span", "dp-prop", "\u{1F4BC}");
    var progressWrap = el("div", "dp-progress");
    var progressFill = document.createElement("i");
    progressWrap.appendChild(progressFill);
    work.appendChild(prop);
    work.appendChild(progressWrap);
    work.hidden = true;
    scene.appendChild(work);
    var pokeHint = el("div", "dp-poke-hint");
    pokeHint.appendChild(el("span", null, "\u{1F446}"));
    pokeHint.appendChild(el("span", null, "\u6233\u4E09\u4E0B"));
    pokeHint.hidden = true;
    scene.appendChild(pokeHint);
    var dailyHint = el("button", "dp-daily");
    dailyHint.hidden = true;
    scene.appendChild(dailyHint);
    var soul = el("span", "dp-soul", "\u{1F47B}");
    soul.hidden = true;
    scene.appendChild(soul);
    var pigArt = document.createElement("img");
    pigArt.className = "dp-pig-img";
    pigArt.alt = "";
    pigArt.hidden = true;
    var pigEmoji = el("span", "dp-pig-emoji", "\u{1F416}");
    var pig = el("div", "dp-pig");
    pig.appendChild(pigArt);
    pig.appendChild(pigEmoji);
    var dressSlots = el("div", "dp-dress");
    pig.appendChild(dressSlots);
    scene.appendChild(pig);
    scene.title = "\u5DE6\u952E\u6478\u6478 \xB7 \u53F3\u952E\u6253\u5F00\u9762\u677F \xB7 \u62D6\u52A8\u53EF\u79FB\u52A8";
    var bar = el("div", "dp-bar");
    var content = el("div", "dp-content");
    card.appendChild(content);
    card.appendChild(bar);
    host.appendChild(card);
    host.appendChild(scene);
    if (document.body !== null && document.body !== void 0) {
      document.body.appendChild(host);
    } else {
      document.addEventListener("DOMContentLoaded", function() {
        try {
          document.body.appendChild(host);
        } catch (error) {
        }
      }, { once: true });
    }
    return { font, style, host, card, scene, hud, hudName, hudCoins, hudHealth, bubble, work, prop, progressWrap, progressFill, pokeHint, dailyHint, soul, pigArt, pigEmoji, pig, dressSlots, bar, content };
  }

  // src/client/index.js
  window.__ModuleLoader__.load({
    id: "dsh-piggy",
    factory: (require2) => {
      var module = { exports: {} };
      var exports = module.exports;
      var devMode = false;
      function apply(ctx) {
        try {
          return mount();
        } catch (error) {
          console.warn("[dsh-piggy] \u6302\u8F7D\u5931\u8D25\uFF0C\u732A\u5148\u9000\u5230\u4E00\u8FB9", error);
          return () => {
          };
        }
      }
      function mount() {
        if (document.querySelector("[" + MOUNTED + "]") !== null) {
          console.warn("[dsh-piggy] \u5DF2\u5B58\u5728\u5B9E\u4F8B\uFF0C\u8DF3\u8FC7\u91CD\u590D\u6302\u8F7D");
          return () => {
          };
        }
        var parts = createScene();
        var {
          font,
          style,
          host,
          card,
          scene,
          hud,
          hudName,
          hudCoins,
          hudHealth,
          bubble,
          work,
          prop,
          progressWrap,
          progressFill,
          pokeHint,
          dailyHint,
          soul,
          pigArt,
          pigEmoji,
          pig,
          dressSlots,
          bar,
          content
        } = parts;
        var savedPos = readStore(POSITION_KEY);
        var userRight = 18;
        var userBottom = 18;
        if (savedPos !== null) {
          try {
            var parsed = JSON.parse(savedPos);
            if (parsed && typeof parsed.right === "number") userRight = parsed.right;
            if (parsed && typeof parsed.bottom === "number") userBottom = parsed.bottom;
          } catch (error) {
          }
        }
        host.style.right = userRight + "px";
        host.style.bottom = userBottom + "px";
        var icons = {};
        var view = normalize(null);
        var tab = "home";
        var stage = "primary";
        var stagePicked = false;
        var drill = { study: null, shop: null, bag: null, work: null, pick: null };
        var souvenirPick = null;
        var picker = null;
        var ownerEdit = null;
        var pigNameEdit = null;
        var cardEdit = null;
        var isOpen = readStore(OPEN_KEY) === "true";
        var lastStage = null;
        var lastPendingAt = 0;
        var lastPendingId = 0;
        var pollTimer = null;
        var fx = createEffects({
          scene,
          pig,
          pigArt,
          card,
          bubble,
          isStopped: function() {
            return stopped;
          }
        });
        var react = fx.react, burst = fx.burst, flash = fx.flash;
        var showBubble = fx.showBubble, showLine = fx.showLine, toast = fx.toast;
        var stopped = false;
        var busy = false;
        var ctx = {
          host,
          card,
          content,
          scene,
          hud,
          hudName,
          hudCoins,
          hudHealth,
          bubble,
          work,
          prop,
          progressWrap,
          progressFill,
          pokeHint,
          dailyHint,
          soul,
          pigArt,
          pigEmoji,
          pig,
          dressSlots,
          bar,
          icons,
          flash,
          react,
          burst,
          showBubble,
          showLine,
          toast,
          get view() {
            return view;
          },
          set view(next) {
            view = next;
          },
          get tab() {
            return tab;
          },
          set tab(next) {
            tab = next;
          },
          get stage() {
            return stage;
          },
          set stage(next) {
            stage = next;
          },
          get stagePicked() {
            return stagePicked;
          },
          set stagePicked(next) {
            stagePicked = next;
          },
          get drill() {
            return drill;
          },
          get picker() {
            return picker;
          },
          set picker(next) {
            picker = next;
          },
          get souvenirPick() {
            return souvenirPick;
          },
          set souvenirPick(next) {
            souvenirPick = next;
          },
          get ownerEdit() {
            return ownerEdit;
          },
          set ownerEdit(next) {
            ownerEdit = next;
          },
          get pigNameEdit() {
            return pigNameEdit;
          },
          set pigNameEdit(next) {
            pigNameEdit = next;
          },
          get cardEdit() {
            return cardEdit;
          },
          set cardEdit(next) {
            cardEdit = next;
          },
          get isOpen() {
            return isOpen;
          },
          set isOpen(next) {
            isOpen = next;
          },
          get lastStage() {
            return lastStage;
          },
          set lastStage(next) {
            lastStage = next;
          },
          get lastPendingAt() {
            return lastPendingAt;
          },
          set lastPendingAt(next) {
            lastPendingAt = next;
          },
          get lastPendingId() {
            return lastPendingId;
          },
          set lastPendingId(next) {
            lastPendingId = next;
          },
          get userRight() {
            return userRight;
          },
          set userRight(next) {
            userRight = next;
          },
          get userBottom() {
            return userBottom;
          },
          set userBottom(next) {
            userBottom = next;
          },
          get busy() {
            return busy;
          },
          set busy(next) {
            busy = next;
          },
          get stopped() {
            return stopped;
          },
          set stopped(next) {
            stopped = next;
          },
          get devMode() {
            return devMode;
          }
        };
        var layout = createLayout(ctx);
        var panel = createPanel(ctx);
        ctx.select = panel.select;
        ctx.setOpen = panel.setOpen;
        ctx.fitPanel = layout.fitPanel;
        ctx.paintBar = layout.paintBar;
        ctx.buildIcon = layout.buildIcon;
        ctx.clampPig = layout.clampPig;
        var render = panel.render, renderContent = panel.renderContent;
        var setOpen = panel.setOpen, select = panel.select;
        var fitPanel = layout.fitPanel, clampPig = layout.clampPig;
        var paintBar = layout.paintBar, buildIcon = layout.buildIcon;
        for (var t = 0; t < TABS.length; t += 1) buildIcon(TABS[t]);
        var io = createIo(ctx);
        var send = io.send, refresh2 = io.refresh;
        ctx.send = send;
        ctx.render = render;
        ctx.renderContent = renderContent;
        ctx.send = send;
        ctx.renderContent = renderContent;
        ctx.setOpen = setOpen;
        ctx.fitPanel = fitPanel;
        ctx.flash = flash;
        dailyHint.addEventListener("pointerdown", function(event) {
          event.stopPropagation();
        });
        dailyHint.addEventListener("click", function(event) {
          event.stopPropagation();
          var action = dailyHint.getAttribute("data-action");
          if (action !== null && action !== "") send(action);
        });
        var drag = null;
        scene.addEventListener("pointerdown", function(event) {
          if (event.button !== 0) return;
          drag = {
            x: event.clientX,
            y: event.clientY,
            right: parseFloat(getComputedStyle(host).right) || 18,
            bottom: parseFloat(getComputedStyle(host).bottom) || 18,
            moved: false
          };
          scene.setAttribute("data-dragging", "true");
          scene.setPointerCapture?.(event.pointerId);
        });
        scene.addEventListener("pointermove", function(event) {
          if (drag === null) return;
          var dx = event.clientX - drag.x;
          var dy = event.clientY - drag.y;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
          userRight = drag.right - dx;
          userBottom = drag.bottom - dy;
          clampPig();
          fitPanel();
        });
        function endDrag() {
          if (drag === null) return false;
          var moved = drag.moved;
          drag = null;
          scene.removeAttribute("data-dragging");
          clampPig();
          writeStore(POSITION_KEY, JSON.stringify({ right: userRight, bottom: userBottom }));
          fitPanel();
          return moved;
        }
        var boxPokes = 0;
        function pokeBox() {
          boxPokes += 1;
          react("poke", 560);
          if (boxPokes >= BOX_POKES_TO_OPEN) {
            boxPokes = 0;
            host.removeAttribute("data-poke");
            showBubble("\u54C7\u2014\u2014\uFF01", 1200);
            burst(["\u2728", "\u{1F389}", "\u{1F4A8}"], 6);
            send("hatch");
            return;
          }
          host.setAttribute("data-poke", String(boxPokes));
          burst(["\u{1F4A8}"], 2);
          showBubble(BOX_POKE_LINES[boxPokes - 1], 2200);
        }
        scene.addEventListener("pointerup", function() {
          if (endDrag()) return;
          if (view.hatched !== true) {
            pokeBox();
            return;
          }
          if (!view.dead) flash("pet");
        });
        scene.addEventListener("pointercancel", function() {
          endDrag();
        });
        scene.addEventListener("contextmenu", function(event) {
          event.preventDefault();
          setOpen(!isOpen);
          if (isOpen && view.pig !== null) flash("pet");
        });
        clampPig();
        setOpen(isOpen);
        render(view);
        refresh2();
        pollTimer = window.setInterval(refresh2, POLL_MS);
        var chatTimer = null;
        function scheduleChat() {
          var minutes = IDLE_CHAT_MINUTES.min + Math.random() * (IDLE_CHAT_MINUTES.max - IDLE_CHAT_MINUTES.min);
          chatTimer = window.setTimeout(function() {
            if (!stopped && !busy && view.pig !== null) send("chat", { reason: "idle" });
            scheduleChat();
          }, minutes * 6e4);
        }
        var greetTimer = window.setTimeout(function() {
          if (!stopped && view.pig !== null) send("chat", { reason: "enter" });
        }, GREET_DELAY_MS);
        scheduleChat();
        function onResize() {
          clampPig();
          fitPanel();
        }
        window.addEventListener?.("resize", onResize);
        function setDevMode(on) {
          devMode = on === true;
          writeStore(DEV_KEY, devMode ? "1" : "0");
          host.setAttribute("data-dev", devMode ? "true" : "false");
          paintBar();
          if (devMode) {
            setOpen(true);
            select("dev");
            showBubble("\u{1F527} \u5F00\u53D1\u8005\u6A21\u5F0F\u5DF2\u5F00", 2e3);
          } else {
            if (tab === "dev") select("status");
            showBubble("\u5F00\u53D1\u8005\u6A21\u5F0F\u5DF2\u5173", 1600);
          }
        }
        devMode = readStore(DEV_KEY) === "1";
        host.setAttribute("data-dev", devMode ? "true" : "false");
        if (devMode) paintBar();
        function onKeyDown(event) {
          if (event.ctrlKey && event.shiftKey && (event.key === "D" || event.key === "d")) {
            event.preventDefault();
            setDevMode(!devMode);
          }
        }
        window.addEventListener?.("keydown", onKeyDown);
        try {
          window.dshPigDev = {
            on: function() {
              setDevMode(true);
            },
            off: function() {
              setDevMode(false);
            },
            toggle: function() {
              setDevMode(!devMode);
            }
          };
        } catch (error) {
        }
        function dispose() {
          stopped = true;
          window.removeEventListener?.("resize", onResize);
          window.removeEventListener?.("keydown", onKeyDown);
          try {
            delete /** @type {any} */
            window.dshPigDev;
          } catch (error) {
          }
          if (pollTimer !== null) window.clearInterval(pollTimer);
          if (chatTimer !== null) window.clearTimeout(chatTimer);
          window.clearTimeout(greetTimer);
          fx.dispose();
          pollTimer = null;
          host.remove();
          style.remove();
          font.remove();
        }
        return dispose;
      }
      exports.name = "dsh-piggy";
      exports.apply = apply;
      return module.exports;
    }
  });
})();
