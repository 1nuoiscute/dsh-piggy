// GENERATED FILE. Edit src/client/ and run `npm run build`; do not edit by hand.
(() => {
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

  // src/client/format.js
  function formatMinutes(minutes) {
    if (minutes < 60) return minutes + " \u5206\u949F";
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? hours + " \u5C0F\u65F6" : hours + " \u5C0F\u65F6" + rest + " \u5206";
  }
  function kindLabel(item) {
    if (item.kind === "medicine") return item.needed ? "\u5BF9\u75C7\uFF01" : "\u836F";
    if (item.kind === "revive") return "\u590D\u6D3B\u7528";
    if (item.kind === "bath") return "\u6D17\u6D74";
    return "\u98DF\u7269";
  }

  // src/client/tabs/bag.js
  function renderBagTab(ui) {
    var owned = [];
    for (var i = 0; i < ui.view.shop.length; i += 1) {
      if (num(ui.view.inventory[ui.view.shop[i].key], 0) > 0) owned.push(ui.view.shop[i]);
    }
    if (owned.length === 0) {
      ui.content.appendChild(el("div", "dp-empty", "\u80CC\u5305\u7A7A\u7A7A\u7684 \u2014\u2014 \u53BB\u300C\u5546\u5E97\u300D\u4E70\u70B9\u4E1C\u897F\u3002"));
    } else {
      var list = el("div", "dp-list");
      for (var j = 0; j < owned.length; j += 1) {
        (function(item) {
          var row = el("div", "dp-item" + (item.needed ? " dp-wanted" : ""));
          row.appendChild(el("span", null, item.emoji));
          var grow = el("div", "dp-grow");
          grow.appendChild(el("div", null, item.label + " \xD7" + num(ui.view.inventory[item.key], 0)));
          grow.appendChild(el("div", "dp-dim", kindLabel(item)));
          row.appendChild(grow);
          var use = button("dp-mini", { "data-use": item.key }, function() {
            ui.send("use", { item: item.key });
          });
          use.textContent = "\u4F7F\u7528";
          row.appendChild(use);
          list.appendChild(row);
        })(owned[j]);
      }
      ui.content.appendChild(list);
    }
    if (ui.view.dress.length > 0) {
      var dhead = el("div", "dp-title");
      dhead.style.marginTop = "10px";
      var wornCount = 0;
      for (var w = 0; w < ui.view.dress.length; w += 1) if (ui.view.dress[w].worn) wornCount += 1;
      dhead.appendChild(el("b", null, "\u{1F455} \u5BB6\u5F53 " + wornCount + "/" + ui.view.dress.length + " \u7A7F\u7740\u4E2D"));
      ui.content.appendChild(dhead);
      var ownedDress = [];
      for (var m = 0; m < ui.view.dress.length; m += 1) if (ui.view.dress[m].owned) ownedDress.push(ui.view.dress[m]);
      if (ownedDress.length === 0) {
        ui.content.appendChild(el("div", "dp-empty", "\u8FD8\u6CA1\u6709\u88C5\u626E \u2014\u2014 \u5546\u5E97\u300C\u88C5\u626E\u300D\u90A3\u4E00\u680F\uFF0C\u7B49\u7EA7\u591F\u4E86\u5C31\u80FD\u4E70\u3002"));
      } else {
        var dlist = el("div", "dp-list");
        for (var n = 0; n < ownedDress.length; n += 1) {
          (function(item) {
            var row = el("div", "dp-item");
            row.appendChild(el("span", null, item.emoji));
            var grow = el("div", "dp-grow");
            grow.appendChild(el("div", null, item.label + (item.worn ? " \xB7 \u7A7F\u7740" : "")));
            grow.appendChild(el("div", "dp-dim", (item.slotLabel === "" ? "" : item.slotLabel + " \xB7 ") + (item.blurb === "" ? "Lv." + item.level + " \u89E3\u9501" : item.blurb)));
            row.appendChild(grow);
            var toggle = button("dp-mini", { "data-wear": item.key }, function() {
              ui.send("wear", { item: item.key, on: !item.worn });
            });
            toggle.textContent = item.worn ? "\u8131\u4E0B" : "\u7A7F\u4E0A";
            row.appendChild(toggle);
            dlist.appendChild(row);
          })(ownedDress[n]);
        }
        ui.content.appendChild(dlist);
      }
    }
    var souvenirs = ui.view.pig.souvenirs;
    var head = el("div", "dp-title");
    head.style.marginTop = "10px";
    head.appendChild(el("b", null, "\u{1F381} \u7EAA\u5FF5\u54C1 " + souvenirs.length));
    ui.content.appendChild(head);
    ui.content.appendChild(el("div", "dp-empty", souvenirs.length === 0 ? "\u6536\u85CF\u518C\u8FD8\u7A7A\u7740\u3002" : souvenirs.map((entry) => entry.emoji + entry.label).join(" \xB7 ")));
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

  // src/client/constants.js
  var STATE_URL = "/dsh-pig/state";
  var ART_URL = "/dsh-pig/art/";
  var ACT_URL = "/dsh-pig/act";
  var POLL_MS = 4e3;
  var MOUNTED = "data-dsh-pig";
  var OPEN_KEY = "dsh-pig:open";
  var POSITION_KEY = "dsh-pig:position";
  var PANEL_WIDTH = 292;
  var PANEL_GAP = 8;
  var PANEL_MARGIN = 10;
  var PANEL_MIN_HEIGHT = 120;
  var SCENE_RESERVE = 132;
  var PIG_PADDING_X = 6;
  var TABS = [
    { key: "status", label: "\u72B6\u6001", emoji: "\u{1F4CB}" },
    { key: "study", label: "\u5B66\u4E60", emoji: "\u{1F4DA}" },
    { key: "work", label: "\u6253\u5DE5", emoji: "\u{1F4BC}" },
    { key: "shop", label: "\u5546\u5E97", emoji: "\u{1F6D2}" },
    { key: "travel", label: "\u65C5\u884C", emoji: "\u{1F9F3}" },
    { key: "bag", label: "\u80CC\u5305", emoji: "\u{1F392}" }
  ];
  var DEV_KEY = "dsh-pig:dev";
  var DEV_TAB = { key: "dev", label: "\u8C03\u8BD5", emoji: "\u{1F527}" };
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
  var KIND_TITLE = { food: "\u{1F34E} \u98DF\u7269", bath: "\u{1F9FC} \u6D17\u6D74", toy: "\u{1FA80} \u73A9\u5177", dress: "\u{1F455} \u88C5\u626E", medicine: "\u{1F48A} \u836F\u54C1", revive: "\u2728 \u590D\u6D3B" };
  var KIND_ORDER = ["food", "bath", "toy", "dress", "medicine", "revive"];

  // src/client/tabs/shop.js
  function renderShopTab(ui) {
    if (ui.view.shop.length === 0) {
      ui.content.appendChild(el("div", "dp-empty", "\u5BBF\u4E3B\u8FD8\u6CA1\u63D0\u4F9B\u8D27\u67B6\u3002"));
      return;
    }
    var head = el("div", "dp-title");
    head.appendChild(el("b", null, "\u{1F6D2} \u5546\u5E97"));
    head.appendChild(el("span", null, "\u{1FA99} " + ui.view.pig.coins));
    ui.content.appendChild(head);
    var list = el("div", "dp-shopgrid");
    var shelf = "";
    var ordered = ui.view.shop.slice().sort(
      (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
    );
    for (var i = 0; i < ordered.length; i += 1) {
      (function(item) {
        if (item.kind !== shelf) {
          shelf = item.kind;
          list.appendChild(el("div", "dp-shelf", KIND_TITLE[shelf] ?? shelf));
        }
        var cell = button(
          "dp-cell" + (item.needed ? " dp-wanted" : "") + (item.kind === "dress" ? " dp-dress" : item.affordable ? "" : " dp-poor") + (item.owned ? " dp-owned" : ""),
          { "data-buy": item.key },
          function() {
            ui.send("buy", { item: item.key });
          }
        );
        cell.appendChild(el("span", "dp-cell-e", item.emoji));
        cell.appendChild(el("span", "dp-cell-n", item.label));
        if (item.owned) {
          cell.appendChild(el("span", "dp-cell-p", "\u5DF2\u62E5\u6709"));
          cell.disabled = true;
        } else if (item.kind === "dress" && item.unlocked === false) {
          cell.appendChild(el("span", "dp-cell-p", "\u{1F512} Lv." + item.level));
        } else {
          cell.appendChild(el("span", "dp-cell-p", item.price + " \u{1FA99}"));
        }
        var owned = num(ui.view.inventory[item.key], 0);
        if (owned > 0) cell.appendChild(el("b", "dp-cell-c", "\xD7" + owned));
        if (item.needed) cell.appendChild(el("b", "dp-cell-tag", "\u9700\u8981"));
        if (item.owned && item.worn) cell.appendChild(el("b", "dp-cell-tag", "\u7A7F\u7740"));
        list.appendChild(cell);
      })(ordered[i]);
    }
    ui.content.appendChild(list);
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

  // src/client/tabs/status.js
  function renderStatusTab(ui) {
    var p = ui.view.pig;
    if (p === null) return;
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
    if (p.memories.length > 0) {
      ui.content.appendChild(el("div", "dp-memo", p.memories.slice(-3).join("\n")));
    }
  }

  // src/client/tabs/study.js
  function renderStudyTab(ui) {
    if (ui.view.subjects.length === 0) {
      ui.content.appendChild(el("div", "dp-empty", "\u5BBF\u4E3B\u8FD8\u6CA1\u63D0\u4F9B\u8BFE\u7A0B\u8868\u3002"));
      return;
    }
    var grid = el("div", "dp-grid");
    for (var i = 0; i < ui.view.subjects.length; i += 1) {
      (function(sub) {
        var btn = button("dp-item", { "data-subject": sub.key }, function() {
          ui.send("study", { subject: sub.key });
        });
        btn.disabled = !ui.view.canGoOut || !sub.affordable;
        btn.style.cursor = "pointer";
        btn.style.textAlign = "left";
        btn.appendChild(el("span", null, sub.emoji));
        var grow = el("div", "dp-grow");
        grow.appendChild(el("div", null, sub.label + (sub.stageLabel ? " \xB7 " + sub.stageLabel : "")));
        grow.appendChild(el("div", "dp-dim", "\u4E0A\u8FC7 " + sub.lessons + " \u8282" + (sub.nextGraduation !== null ? " \xB7 \u5DEE " + (sub.nextGraduation - sub.lessons) + " \u8282\u6BD5\u4E1A" : "")));
        grow.appendChild(el("div", "dp-dim", sub.minutes + " \u5206 \xB7 " + sub.tuition + " \u{1FA99} \xB7 " + sub.traitEmoji + "+" + sub.gain));
        btn.appendChild(grow);
        grid.appendChild(btn);
      })(ui.view.subjects[i]);
    }
    ui.content.appendChild(grid);
    if (ui.view.interests.length > 0) {
      var ihead = el("div", "dp-title");
      ihead.style.marginTop = "10px";
      ihead.appendChild(el("b", null, "\u{1F3AF} \u5174\u8DA3 \xB7 \u8BC1\u4E66"));
      ui.content.appendChild(ihead);
      var ilist = el("div", "dp-list");
      for (var n = 0; n < ui.view.interests.length; n += 1) {
        (function(entry) {
          var row = el("div", "dp-item");
          row.appendChild(el("span", null, entry.emoji));
          var grow = el("div", "dp-grow");
          grow.appendChild(el("div", null, entry.label));
          var progress = entry.certificate === "" ? entry.times > 0 ? " \xB7 \u5B66\u8FC7 " + entry.times + " \u6B21" : "" : entry.certified ? " \xB7 \u{1F4DC} \u5DF2\u6709" + entry.certificate : " \xB7 \u{1F4DC} " + entry.certificate + " " + entry.times + "/" + entry.certificateAfter;
          grow.appendChild(el("div", "dp-dim", entry.minutes + " \u5206 \xB7 " + entry.cost + " \u{1FA99} \xB7 " + entry.traitEmoji + entry.traitLabel + " +" + entry.gain + progress));
          row.appendChild(grow);
          var go = button("dp-mini", { "data-interest": entry.key }, function() {
            ui.send("interest", { interest: entry.key });
          });
          go.textContent = entry.times > 0 ? "\u518D\u5B66" : "\u53BB\u5B66";
          go.disabled = !ui.view.canGoOut || !entry.affordable;
          row.appendChild(go);
          ilist.appendChild(row);
        })(ui.view.interests[n]);
      }
      ui.content.appendChild(ilist);
    }
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
    "[data-dsh-pig] .dp-poke-hint[hidden],",
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
    "box-shadow:var(--ac-shadow-lg);color:var(--ac-text-body)}",
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
    "@keyframes dp-squash{0%{transform:scale(1,1)}25%{transform:scale(1.28,.74)}55%{transform:scale(.92,1.14)}100%{transform:scale(1,1)}}",
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
    '.dp-pig[data-react="pet"]{animation-name:dp-squash;animation-duration:.6s}',
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
    "50%{transform:rotate(6deg)}75%{transform:rotate(-4deg)}}",
    /* ---------- shop: a grid of tiles, three to a row ---------- */
    ".dp-shopgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}",
    // The shelf heading is a grid child too, so it has to span the whole row.
    ".dp-shopgrid .dp-shelf{grid-column:1/-1;margin:5px 0 0}",
    ".dp-shopgrid .dp-shelf:first-child{margin-top:0}",
    ".dp-cell{position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;",
    "padding:7px 3px 6px;border:1.5px solid var(--ac-border-light);border-radius:12px;"
  ].join("");

  // src/client/css-tabs.js
  var CSS_TABS = [
    "background:var(--ac-bg);cursor:pointer;font-family:inherit;text-align:center;",
    "transition:transform .12s var(--ac-ease),box-shadow .12s var(--ac-ease)}",
    ".dp-cell:hover{transform:translateY(-1px);box-shadow:0 3px 0 rgba(61,52,40,.14)}",
    ".dp-cell:active{transform:translateY(1px)}",
    ".dp-cell-e{font-size:22px;line-height:1.15}",
    ".dp-cell-n{font-size:10px;font-weight:700;color:var(--ac-text);line-height:1.2;",
    "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}",
    ".dp-cell-p{font-size:9.5px;font-weight:600;color:var(--ac-text-2)}",
    // Owned count and the "needed" flag are badges so they cost no extra row.
    ".dp-cell-c{position:absolute;top:3px;right:4px;font-size:9px;font-weight:800;",
    "color:#fff;background:var(--ac-primary);border-radius:var(--ac-pill);padding:0 4px;line-height:13px}",
    ".dp-cell-tag{position:absolute;top:3px;left:4px;font-size:8px;font-weight:800;",
    "color:#7a5a12;background:var(--ac-warning);border-radius:var(--ac-pill);padding:0 4px;line-height:13px}",
    // Affordable is colour; unaffordable is faded but still clickable, so a
    // tap can explain how much is missing instead of doing nothing.
    ".dp-cell.dp-poor{opacity:.45}",
    // 家当 already owned: not for sale, but not "unaffordable" either.
    ".dp-cell.dp-owned{opacity:.6;border-style:dashed}",
    ".dp-cell.dp-wanted{background:#fdf7e2;border-color:var(--ac-warning)}",
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
    ".dp-seg{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:9px}",
    ".dp-seg button{font:inherit;font-size:10.5px;font-weight:600;color:var(--ac-text-muted);",
    "cursor:pointer;padding:6px 2px;border-radius:var(--ac-pill);",
    "border:2px solid var(--ac-border-light);background:var(--ac-bg-input);",
    "transition:all .2s var(--ac-ease)}",
    ".dp-seg button:hover{background:var(--ac-hover)}",
    '.dp-seg button[data-active="true"]{background:var(--ac-active);border-color:#9db0d6;',
    "color:var(--ac-text);font-weight:700}",
    /* ---------- list rows ---------- */
    ".dp-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}",
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
    ".dp-pick{margin-top:9px;padding:9px 10px;border-radius:var(--ac-radius-sm);",
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

  // src/client/styles.js
  var CSS = CSS_BASE + CSS_TABS;

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
  function renderWorkTab(ui) {
    if (ui.view.jobs.length === 0) {
      ui.content.appendChild(el("div", "dp-empty", "\u5BBF\u4E3B\u8FD8\u6CA1\u63D0\u4F9B\u5DE5\u4F5C\u5217\u8868\u3002"));
      return;
    }
    var TIERS = [[45, "\u{1F331} \u8D77\u6B65"], [60, "\u{1F4DA} \u5C0F\u5B66\u6BD5\u4E1A"], [120, "\u{1F3EB} \u4E2D\u5B66\u6BD5\u4E1A"], [240, "\u{1F3DB} \u5927\u5B66\u6BD5\u4E1A"], [Infinity, "\u{1F52C} \u7814\u7A76\u751F"]];
    var tierOf = function(job) {
      var minutes = job.baseMinutes || job.minutes;
      for (var t = 0; t < TIERS.length; t += 1) if (minutes <= TIERS[t][0]) return TIERS[t][1];
      return "";
    };
    var list = el("div", "dp-list");
    var lastTier = null;
    for (var i = 0; i < ui.view.jobs.length; i += 1) {
      (function(job) {
        var tier = tierOf(job);
        if (tier !== lastTier && ui.view.jobs.length > 12) {
          lastTier = tier;
          var head = el("div", "dp-title");
          head.appendChild(el("b", null, tier));
          list.appendChild(head);
        }
        var row = el("div", "dp-item");
        row.appendChild(el("span", null, job.emoji));
        var grow = el("div", "dp-grow");
        grow.appendChild(el("div", null, job.label));
        var line = job.minutes + " \u5206\u949F \xB7 \u8D5A " + job.coins + " \u{1FA99}";
        if (job.traitPoints > 0) {
          line += " \xB7 \u7701 " + job.speedPercent + "% \u65F6\u95F4";
        }
        grow.appendChild(el("div", "dp-dim", line));
        var byTrait = job.traitEmoji + job.traitLabel + " " + job.traitPoints + (job.payPercent > 0 ? " \xB7 \u62A5\u916C +" + job.payPercent + "%" : "");
        grow.appendChild(el("div", "dp-dim", byTrait));
        var locked = job.qualified === false;
        if (locked) grow.appendChild(el("div", "dp-lock", "\u{1F512} \u9700\u8981 " + job.lockText));
        row.appendChild(grow);
        var go = button("dp-mini", { "data-job": job.key }, function() {
          ui.send("work", { job: job.key });
        });
        go.textContent = locked ? "\u6CA1\u8D44\u683C" : "\u51FA\u53D1";
        go.disabled = !ui.view.canGoOut || locked;
        row.appendChild(go);
        list.appendChild(row);
      })(ui.view.jobs[i]);
    }
    ui.content.appendChild(list);
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
      reactTimer = window.setTimeout(function() {
        pig.removeAttribute("data-react");
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
          ctx.react("refuse", 520);
          if (next.reason === "no-item") {
            var emptyKind = str(next.kind, "");
            ctx.showBubble(NO_ITEM_LINE[emptyKind] ?? "\u80CC\u5305\u91CC\u6CA1\u6709\u80FD\u7528\u7684\u4E1C\u897F", 3200);
            return;
          }
          var reasons = {
            box: "\u5148\u628A\u7EB8\u76D2\u62C6\u5F00",
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
    async function refresh() {
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
    return { send, refresh };
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
      if (ctx.icons[ctx.tab] === void 0) ctx.tab = "status";
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
          faded: obj(pig.stage).faded === true
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
        level: num(obj(job).level, 1)
      })).filter((job) => job.key !== ""),
      // B4: nine subjects, each with its own lesson count and stage.
      subjects: arr(d.subjects).map((sub) => ({
        key: str(obj(sub).key, ""),
        label: str(obj(sub).label, "\u8BFE"),
        emoji: str(obj(sub).emoji, "\u{1F4D8}"),
        traitLabel: str(obj(sub).traitLabel, ""),
        traitEmoji: str(obj(sub).traitEmoji, ""),
        lessons: num(obj(sub).lessons, num(obj(sub).level, 0)),
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
      return window.localStorage.getItem(key);
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

  // src/client/panel.js
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
      ctx.tab = next;
      ctx.picker = null;
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
      if (ctx.view.pig !== null && ctx.view.dead) {
        var dead = el("div", "dp-alert dp-dead");
        dead.appendChild(el("b", null, "\u{1FAA6} " + ctx.view.pig.name + " \u8D70\u4E86" + (ctx.view.pig.soul ? "\uFF0C\u7075\u9B42\u8FD8\u7559\u5728\u5893\u7891\u4E0A \u{1F47B}" : "")));
        dead.appendChild(el("div", null, ctx.view.pig.soul ? "\u7528\u8FD8\u9B42\u4E39\u53EF\u4EE5\u628A\u5B83\u53EB\u56DE\u6765\uFF0C\u6216\u8005\u9886\u517B\u4E00\u53EA\u65B0\u7684\u5C0F\u732A" : "\u5728\u300C\u80CC\u5305\u300D\u91CC\u7528\u8FD8\u9B42\u4E39\u5C31\u80FD\u6551\u56DE\u6765\uFF08\u91D1\u5E01\u3001\u6536\u85CF\u3001\u4E0A\u8FC7\u7684\u8BFE\u90FD\u4FDD\u7559\uFF09"));
        ctx.content.appendChild(dead);
        var adoptWrap = el("div", "dp-actions");
        var adopt = button("dp-btn dp-btn-wide", { "data-action": "adopt" }, function() {
          ctx.send("adopt");
        });
        adopt.appendChild(el("span", null, "\u{1F4E6}"));
        adopt.appendChild(el("span", null, "\u9886\u517B\u65B0\u732A"));
        adoptWrap.appendChild(adopt);
        ctx.content.appendChild(adoptWrap);
      } else if (ctx.view.pig !== null && ctx.view.pig.illness !== null) {
        var illness = ctx.view.pig.illness;
        var sick = el("div", "dp-alert dp-sick");
        sick.appendChild(el("b", null, "\u{1F912} " + illness.name + "\uFF08\u7B2C " + illness.stage + "/4 \u671F\uFF09"));
        sick.appendChild(el("div", null, "\u9700\u8981\u300C" + illness.cureEmoji + illness.cure + "\u300D\u2014\u2014 \u5403\u9519\u836F\u4F1A\u52A0\u91CD"));
        var needed = null;
        var shelf = ctx.view.shop || [];
        for (var c = 0; c < shelf.length; c += 1) {
          if (shelf[c].needed) needed = shelf[c];
        }
        for (var t = 0; needed === null && t < shelf.length; t += 1) {
          if (shelf[t].kind === "medicine" && shelf[t].tier === illness.stage) needed = shelf[t];
        }
        for (var n = 0; needed === null && n < shelf.length; n += 1) {
          if (shelf[n].label === illness.cure) needed = shelf[n];
        }
        if (ctx.view.canGoOut) {
          sick.appendChild(el(
            "div",
            "dp-dim",
            "\u5E26\u75C5\u4E5F\u80FD\u51FA\u95E8\uFF0C\u4F46\u62A5\u916C\u53EA\u6709\u4E00\u534A\uFF1B\u5728\u5916\u9762\u75C5\u60C5\u4F1A\u8D70\u5F97\u66F4\u5FEB\uFF0C\u8EBA\u7740\u517B\u6700\u7701"
          ));
        }
        if (needed !== null && ctx.view.canGoOut && ctx.view.pig.coins < needed.price) {
          sick.appendChild(el(
            "div",
            "dp-dim",
            "\u94B1\u4E0D\u591F\u4E5F\u6CA1\u5173\u7CFB \u2014\u2014 \u5148\u53BB\u6253\u5DE5\uFF0C\u8D5A\u591F " + needed.price + " \u{1FA99} \u4E70\u300C" + needed.label + "\u300D"
          ));
        }
        ctx.content.appendChild(sick);
        if (illness.doctorFee !== null) {
          var clinic = el("div", "dp-actions");
          var doctor = button("dp-btn dp-btn-wide", { "data-action": "doctor" }, function() {
            ctx.send("doctor");
          });
          doctor.appendChild(el("span", null, "\u{1F3E5}"));
          doctor.appendChild(el("span", null, "\u770B\u533B\u751F\uFF08" + illness.doctorFee + " \u{1FA99}\uFF09"));
          clinic.appendChild(doctor);
          ctx.content.appendChild(clinic);
        }
      } else if (ctx.view.pig !== null && ctx.view.activity !== null) {
        var away = el("div", "dp-alert dp-work");
        away.appendChild(el("b", null, ctx.view.activity.emoji + " \u5728\u5916\u9762\uFF1A" + ctx.view.activity.label));
        away.appendChild(el("div", null, "\u8FD8\u6709 " + ctx.view.activity.secondsLeft + " \u79D2"));
        ctx.content.appendChild(away);
        var wrap = el("div", "dp-actions");
        var call = button("dp-btn dp-btn-wide", { "data-action": "calloff" }, function() {
          ctx.send("calloff");
        });
        call.appendChild(el("span", null, "\u21A9\uFE0F"));
        call.appendChild(el("span", null, "\u53EB\u5B83\u56DE\u6765"));
        wrap.appendChild(call);
        ctx.content.appendChild(wrap);
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
        ctx.content.appendChild(el("div", "dp-empty", "\u62C6\u5F00\u5C31\u4F1A\u8E66\u51FA\u4E00\u53EA\u5C0F\u732A \u2014\u2014 \u4E0D\u7528\u6572\u547D\u4EE4"));
        return;
      }
      if (ctx.tab === "status") renderStatusTab(ctx.ui);
      else if (ctx.tab === "study") renderStudyTab(ctx.ui);
      else if (ctx.tab === "work") renderWorkTab(ctx.ui);
      else if (ctx.tab === "shop") renderShopTab(ctx.ui);
      else if (ctx.tab === "travel") renderTravelTab(ctx.ui);
      else if (ctx.tab === "dev") renderDevTab(ctx.ui);
      else renderBagTab(ctx.ui);
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
      if (firstOpen !== null && (stageEntry === null || stageEntry.unlocked === false)) ctx.stage = firstOpen;
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
          ctx.pigArt.src = ART_URL + pigStage.art + ".svg";
          ctx.pigArt.hidden = false;
          ctx.pigEmoji.hidden = true;
          ctx.pig.setAttribute("data-art", pigStage.art);
        } else {
          ctx.pigArt.hidden = true;
          ctx.pigArt.removeAttribute("src");
          ctx.pigEmoji.hidden = false;
          ctx.pigEmoji.textContent = pigStage.emoji;
          ctx.pig.removeAttribute("data-art");
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
        ctx.toast(str(event.text, "\u732A\u6709\u65B0\u6D88\u606F"));
        if (event.kind === "levelup") {
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
    return { font, style, host, card, scene, hud, hudName, hudCoins, hudHealth, bubble, work, prop, progressWrap, progressFill, pokeHint, soul, pigArt, pigEmoji, pig, dressSlots, bar, content };
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
          console.warn("[dsh-pig] \u6302\u8F7D\u5931\u8D25\uFF0C\u732A\u5148\u9000\u5230\u4E00\u8FB9", error);
          return () => {
          };
        }
      }
      function mount() {
        if (document.querySelector("[" + MOUNTED + "]") !== null) {
          console.warn("[dsh-pig] \u5DF2\u5B58\u5728\u5B9E\u4F8B\uFF0C\u8DF3\u8FC7\u91CD\u590D\u6302\u8F7D");
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
        var tab = "status";
        var stage = "primary";
        var souvenirPick = null;
        var picker = null;
        var ui = {
          get view() {
            return view;
          },
          set view(next) {
            view = next;
          },
          get content() {
            return content;
          },
          set content(next) {
            content = next;
          },
          get host() {
            return host;
          },
          set host(next) {
            host = next;
          },
          get picker() {
            return picker;
          },
          set picker(next) {
            picker = next;
          },
          get stage() {
            return stage;
          },
          set stage(next) {
            stage = next;
          },
          get souvenirPick() {
            return souvenirPick;
          },
          set souvenirPick(next) {
            souvenirPick = next;
          }
        };
        var isOpen = readStore(OPEN_KEY) === "true";
        var lastStage = null;
        var lastPendingAt = 0;
        var lastPendingId = 0;
        var pollTimer = null;
        var fx = createEffects({
          scene,
          pig,
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
          soul,
          pigArt,
          pigEmoji,
          pig,
          dressSlots,
          bar,
          icons,
          flash,
          ui,
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
          get picker() {
            return picker;
          },
          set picker(next) {
            picker = next;
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
        var send = io.send, refresh = io.refresh;
        ctx.send = send;
        ctx.render = render;
        ctx.renderContent = renderContent;
        ui.send = send;
        ui.renderContent = renderContent;
        ui.setOpen = setOpen;
        ui.fitPanel = fitPanel;
        ui.flash = flash;
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
        refresh();
        pollTimer = window.setInterval(refresh, POLL_MS);
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
