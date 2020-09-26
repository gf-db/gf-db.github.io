'use strict';
const localstorage_page_prefix = 'gfdb_';

// ----------------------------------------------------------------------------
// True constants block: connected to other data sources, such as json data types, csv fields or css classes.
// You should NOT change their values, otherwise it WILL break something.
//
const all_list_id      = 'all_list';
const my_list_id       = 'my_list';

const css_class_finger = 'finger';
const css_class_header = 'darken_bg';
const css_class_zero_opac = 'zero-opacity';
const css_class_part_opac = 'partial-opacity';
const css_class_bg_on_hover = 'bg_on_hover';
const css_class_noselect = 'noselect';
const css_baseclass_class = 'class_';
const css_baseclass_rarity = 'rarity';
const css_class_fixed = 'fixed';
const css_class_past = 'red_bg';
const css_class_present = 'green_bg';
const css_class_future = 'blue_bg';
const css_class_recipelist = 'recipelist';

const tdoll_class_list = ['HG', 'SMG', 'AR', 'RF', 'MG', 'SG'];
const equip_class_list = ['opt', 'holo', 'rds', 'nv', 'ap', 'hv', 't-exo', 'armor', 'x-exo', 'supp', 'box', 'hp', 'buck', 'slug', 'cape'];
const fairy_class_list = ['battle', 'strategy'];
const rarity_list      = ['6', '5', '4', '3', '2', '1'];  // TODO: temporary hack where fairies are fake 6* rarity
const stat_dir = "../stats/";

const class_str        = 'class';
const rarity_str       = '*';
const id_str           = 'id';
const mp_str           = 'mp';
const ammo_str         = 'ammo';
const mre_str          = 'mre';
const part_str         = 'part';
const tier_str         = 'tier';
const count_str        = 'count';
const total_str        = 'total';
const craft_time_str   = 'craft time';
const epoch_str        = 'epoch';
const name_str         = 'name';
const type_str         = 'type';

const csv_entity_separator = '\n';
const csv_field_separator  = ',';
const csv_keyval_separator = ':';
const csv_range_separator  = '-';
const epoch_separator      = '.';

const dir_asc  = -1;
const dir_desc = 1;

const MAX_DATE = 8640000000000000;
const secs_in_day = 86400;

// these are for table types (gun table contains tdolls, equ table contains equips and fairies)
const gun_str = 'gun';
const equ_str = 'equ';

// these are for item types
const tdoll_str = 'tdoll';
const equip_str = 'equip';
const fairy_str = 'fairy';

// This sub-block is internal-only, but other true constants depend on it, so... TODO: where to put it?
// Also, no dashes allowed in these strings!
const tdoll_recipe_str = 'tdoll_recipe';
const equip_recipe_str = 'equip_recipe';
const fairy_recipe_str = 'fairy_recipe';
const tdoll_list_str   = 'tdoll_list';
const equip_list_str   = 'equip_list';
const fairy_list_str   = 'fairy_list';

const keys_to_parse = [  // TODO: check if other keys need to be added here
                       sort_type(tdoll_str),
                       sort_type(equip_str),
                       sort_type(fairy_str),
                       sort_type(tdoll_recipe_str),
                       sort_type(equip_recipe_str),
                       sort_type(fairy_recipe_str),
                      ];
const keys_to_erase = ['clicked'];
const keys_to_init  = [type_str];
//
// True constants block end.
// ----------------------------------------------------------------------------
// Convenience constants block: used for display purposes only.
// You may change values of these if you wish.
//
const mean_str         = 'mean %';
const stdev_str        = 'stdev %';
//const relvar_str     = 'iVMR';  // inverse variance to mean ratio
const ev_mp_str        = 'EV.mp';
const ev_ammo_str      = 'EV.ammo';
const ev_mre_str       = 'EV.mre';
const ev_part_str      = 'EV.part';
const ev_contr_str     = 'EV.contr';
const ev_weighted_str  = 'EV.W';

const super_index      = ['¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];  // unicode superscripts

const precision   = 3;  // digits after decimal separator
const magnification = 100;  // scaling multiplier for some small values; 100 gives percentages and so on
const low_CR_warning = 97;

// This comes dangerously close to the "logic sacrificed for (perceived) user-friendliness" territory, maybe I should just delete it...
const default_sort_direction = [
  {sort_column:mp_str        , dir:dir_asc},
  {sort_column:ammo_str      , dir:dir_asc},
  {sort_column:mre_str       , dir:dir_asc},
  {sort_column:part_str      , dir:dir_asc},
  {sort_column:tier_str      , dir:dir_asc},
  {sort_column:count_str     , dir:dir_desc},
  {sort_column:total_str     , dir:dir_desc},
  {sort_column:mean_str      , dir:dir_desc},
  {sort_column:stdev_str     , dir:dir_asc},
  {sort_column:id_str        , dir:dir_asc},
  {sort_column:rarity_str    , dir:dir_desc},
  {sort_column:class_str     , dir:dir_asc},
  {sort_column:name_str      , dir:dir_asc},
  {sort_column:craft_time_str, dir:dir_desc},
];
//
// Convenience constants block end.
// ----------------------------------------------------------------------------
// Parameter constants block: used to control certain aspects of program behaviour.
// You may change these if you know what you are doing.
//
const fetch_options = { cache: "no-cache" };  // force-validate if the data we are fetching is sufficiently new
//
// Parameter constants block end.
// ----------------------------------------------------------------------------
// Global variables block: contains variables that are necessarily global.
//
let main = new Object();
//
// Global variables block end.
// ----------------------------------------------------------------------------
// Functions block: the rest of everything.
//

async function init() {
  try {
    const [
      data_tdoll,
      data_equip,
      data_fairy,

      gunepoch,
      equepoch,

      id_gunepoch_tdoll,
      id_equepoch_equip,
      id_equepoch_fairy,

      tdoll_names,
      fairy_names,

    ] = await Promise.all([
      fetch('./table_info-tdoll.csv', fetch_options), 
      fetch('./table_info-equip.csv', fetch_options),
      fetch('./table_info-fairy.csv', fetch_options),

      fetch('./table_epoch-gun_EN.csv', fetch_options),
      fetch('./table_epoch-equ_EN.csv', fetch_options),

      fetch('./tjoin_guncraftepoch-tdollid_EN.csv', fetch_options),
      fetch('./tjoin_equcraftepoch-equipid_EN.csv', fetch_options),
      fetch('./tjoin_equcraftepoch-fairyid_EN.csv', fetch_options),

      fetch('./tjoin_id-tdollname_EN.csv', fetch_options),
      fetch('./tjoin_id-fairyname_EN.csv', fetch_options),

    ]);
    const [
      data_tdoll_text,
      data_equip_text,
      data_fairy_text,

      gunepoch_text,
      equepoch_text,

      id_gunepoch_tdoll_text,
      id_equepoch_equip_text,
      id_equepoch_fairy_text,

      tdoll_names_text,
      fairy_names_text,

    ] = await Promise.all([
      data_tdoll.text(),
      data_equip.text(),
      data_fairy.text(),

      gunepoch.text(),
      equepoch.text(),

      id_gunepoch_tdoll.text(),
      id_equepoch_equip.text(),
      id_equepoch_fairy.text(),

      tdoll_names.text(),
      fairy_names.text(),

    ]);
    let id_tdoll_epoch_map = parse_range_map(id_gunepoch_tdoll_text);
    let id_equip_epoch_map = parse_range_map(id_equepoch_equip_text);
    let id_fairy_epoch_map = parse_range_map(id_equepoch_fairy_text);

    let gunepoch_map = parse_multimap(gunepoch_text, date_parser);
    let equepoch_map = parse_multimap(equepoch_text, date_parser);

    let tdoll_name_map = parse_plain_map(tdoll_names_text);
    let fairy_name_map = parse_plain_map(fairy_names_text);

    main[tdoll_str] = parse_multiarray(data_tdoll_text, tdoll_class_list);
    main[equip_str] = parse_multiarray(data_equip_text, equip_class_list);
    main[fairy_str] = parse_multiarray(data_fairy_text, fairy_class_list);

    property_insert(main[tdoll_str].arr, id_tdoll_epoch_map, id_str, epoch_str);  // TODO: remove .arr incapsulation failure
    property_insert(main[equip_str].arr, id_equip_epoch_map, id_str, epoch_str);
    property_insert(main[fairy_str].arr, id_fairy_epoch_map, id_str, epoch_str);

    property_insert(main[tdoll_str].arr, tdoll_name_map, id_str, name_str);
    property_insert(main[fairy_str].arr, fairy_name_map, id_str, name_str);

    main[epoch_str] = new Object();
    main[epoch_str][gun_str] = gunepoch_map;
    main[epoch_str][equ_str] = equepoch_map;

    document.onkeypress = on_global_keypress;
    window.onpopstate = function (ev) { navigate_to(ev.state); };

    navigate_to(history.state);
  } catch (e) {
    document.body.innerHTML = "Something broke ;(. Please inform the site owner. Error message: " + e.message;
  }
}

async function deinit() {
  //save_map(my_map, "map");
}

function date_parser(value) {
  let date;
  date = Date.parse(value + 'T00:00:00-08:00');
  if (!isNaN(date)) {  // Would accept '2019-01-23'
    return msec_to_sec(date);
  }
  date = Date.parse(value + ' 00:00:00 UTC-0800');
  if (!isNaN(date)) {  // Would accept '2019 Jan 23'
    return msec_to_sec(date);
  }
  return value;  // default: return value as-is, assuming it is unix epoch
}

function parse_multiarray(textstr, class_list) {
  const strings = textstr.split(csv_entity_separator);
  const len = strings.length;
  let retval = new Object();
  retval.props = strings[0].split(csv_field_separator);
  retval.arr = create_array(rarity_list.length, class_list.length, 0);
  retval.map = new Map();
  const prop_len = retval.props.length;
  for (let i = 1; i < len; i++) {
    let a = strings[i].split(csv_field_separator);
    if (a.length > 1 && a.length == prop_len) {
      let item = new Object();
      for (let j = 0; j < prop_len; j++) {  // TODO: j=0 should be its id, so it goes in key, not value
        item[retval.props[j]] = a[j];
      }
      retval.arr[indexof_rarity(item[rarity_str])][indexof_class(item[class_str], class_list)].push(item);
      retval.map.set(item[id_str], item);
    }
  }
  retval.class_list = class_list;
  return retval;
}

function parse_plain_map(map_text) {
  const strings = map_text.split(csv_entity_separator);
  const len = strings.length;
  let map = new Map();
  for (let i = 0; i < len; i++) {
    let a = strings[i].split(csv_field_separator);
    if (a.length == 2) {
      map.set(a[0], a[1]);
    }
  }
  return map;
}

function parse_range_map(map_text) {
  const strings_arr = map_text.split(csv_entity_separator);
  const len = strings_arr.length;
  let map = new Map();
  for (let i = 0; i < len; i++) {
    const onestr_arr = strings_arr[i].split(csv_keyval_separator);
    if (onestr_arr.length == 2) {
      const values_arr = onestr_arr[1].split(csv_field_separator);
      const varrlen = values_arr.length;
      for (let j = 0; j < varrlen; j++) {
        const val = values_arr[j];
        if (val.indexOf(csv_range_separator) == -1) {
          map.set(val, onestr_arr[0]);
        } else {
          const range = val.split(csv_range_separator);
          const start = Number(range[0]);
          const end   = Number(range[1]);
          for (let k = start; k <= end; k++) {
            map.set(""+k, onestr_arr[0]);
          }
        }
      }
    }
  }
  return map;
}

function parse_multimap(mmap_text, parsing_fn) {
  const strings = mmap_text.split(csv_entity_separator);
  const len = strings.length;
  let map = new Map();
  let tmpmax = new Map();
  let prev = undefined;
  for (let i = 0; i < len; i++) {
    let s = strings[i].split(csv_field_separator);
    if (s.length == 2) {
      const key = Number(s[0]);
      if (parsing_fn !== undefined) {
        s[1] = parsing_fn(s[1]);
      }
      const val = Number(s[1]);
      let subkey = tmpmax.get(key);
      if (subkey === undefined) {
        subkey = 0;
      } else {
        subkey++;
      }
      tmpmax.set(key, subkey);
      let allkey = epoch_merge(key, subkey);
      map.set(allkey, { epkey:key, subkey:subkey, start:val, prev:prev, next:undefined } );
      const curr = map.get(allkey);
      if (prev !== undefined) {
        prev.next = curr;
      }
      prev = curr;
    }
  }
  return map;
}

function property_join(left_map, right_map) {
  for (const [key, value] of left_map.entries()) {
    left_map.set(key, right_map.get(value));
  }
}

/*
 * Takes a multidimensional array of objects and a key-value map.
 * For every object in array with a "common_key" property looks up corresponding
 * value in "map" and inserts that key-value pair into object.
 */
function property_insert(multiarray, map, common_key, new_key) {
  if (multiarray === undefined) {
    return;
  }
  if (multiarray instanceof Array) {
    for (let i = 0; i < multiarray.length; i++) {
      property_insert(multiarray[i], map, common_key, new_key);
    }
  } else {
    multiarray[new_key] = map.get(multiarray[common_key]);
  }
}

function create_list_table(a, data_type, show_item_class, o) {
  const ep_fullname = o[ep_num(data_type)];
  const cur_epoch = Number(epoch_split_main(ep_fullname));  // TODO: support for string epochs?
  const cur_block = Number(epoch_split_sub(ep_fullname));

  let tbl = document.createElement('table');
  let tbody = tbl.appendChild(document.createElement('tbody'));

  const table_class = data_type + '_table_class';
  if (document.getElementsByClassName(table_class).length == 0) {
    let style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `.${table_class} td { width: ${100/a.class_list.length}%; }`;
    document.getElementsByTagName('body')[0].appendChild(style);
  }
  css_class_add(tbl, table_class);

  let max_visible_rows = create_array(rarity_list.length, a.class_list.length, 0);
  for (let r = 0; r < rarity_list.length; r++) {  // loop over single-rarity blocks
    const max_len = max_length(a.arr[r]);
    for (let k = 0; k < max_len; k++) {  // loop over single rows in the table (innermost array)
      for (let c = 0; c < a.class_list.length; c++) {  // loop over class types in the single row
        const el = a.arr[r][c][k];
        if (is_item_showable(el, cur_epoch)) {
          max_visible_rows[r][c]++;
        }
      }
    }
    const max_row = max_visible_rows[r].reduce((a, b) => Math.max(a, b), 0);
    let insert_index = create_array(a.class_list.length);
    for (let i = 0; i < insert_index.length; i++) {
      insert_index[i] = 0;
    }

    let name_cells = create_array(a.class_list.length, 0);

    // create rows and cells (only as much as needed)
    for (let k = 0; k < max_row; k++) {  // loop over single rows in the table (innermost array)
      let tr = tbody.insertRow();
      if (k == 0) {
        add_horizontal_border(tr);
      }
      for (let c = 0; c < a.class_list.length; c++) {  // loop over class types in the single row
        let name_cell = tr.insertCell();
        name_cells[c].push(name_cell);
        add_vertical_border(name_cell);
      }
    }

    // fill rows and cells with data
    for (let k = 0; k < max_len; k++) {  // loop over single rows in the table (innermost array)
      for (let c = 0; c < a.class_list.length; c++) {  // loop over class types in the single row
        const el = a.arr[r][c][k];
        if (!is_item_showable(el, cur_epoch)) {
          continue;
        }

        let name_cell = name_cells[c][insert_index[c]];

        const id = Number(el[id_str]);
        const class_indicator = (show_item_class ? `<span class='sup'>${el[class_str]} </span>` : '');
        const new_indicator   = (el[epoch_str]==cur_epoch && cur_epoch!=0 && cur_block==0 && show_item_class ? ' ★' : '');  // TODO: remove reuse of show_item_class bool as indicator of equip
        name_cell.innerHTML = class_indicator + el[name_str] + new_indicator;
        css_class_add(name_cell, css_class_finger);
        css_class_add(name_cell, css_class(el[class_str], el[rarity_str]));  // can do this conditional on item existing to blank out yet uncraftable items
        name_cell.dataset[type_str] = data_type;  // TODO: extend to fairies
        name_cell.dataset[id_str] = id;
        name_cell.dataset[ep_num(data_type)] = ep_fullname;

        insert_index[c]++;
      }
    }
  }
  set_mouse_event_handlers(tbl);
  return tbl;
}

function css_class(class_string, rarity_string) {  // TODO
  // a little hardcode: fairies get css by class, tdolls and equips get css by rarity
  if (fairy_class_list.indexOf(class_string) != -1) {
    return css_baseclass_class + class_string;
  } else {
    return css_baseclass_rarity + rarity_string;
  }
}

function click_handler(e) {
  if (e.button != 0) {
    return;
  }
  let dataset = e.target.dataset;
  if (dataset[type_str] === undefined) {  // handles both single cell clicks on main page and cell clicks with row attrs on item/recipe pages
    dataset = e.target.parentNode.dataset;
  }
  if (dataset[type_str] === undefined) {  // still nothing? hmpf, i-it's not like I wanted to handle your event or anything
    return;
  }
  let save_hist = true;
  let obj = object_from_dataset(dataset);
  if (dataset.clicked !== undefined) {  // clicked sort column in some table
    save_hist = false;
    let a = obj[sort_type(dataset[type_str])];
    let item = a.find(item => item.sort_column === dataset.clicked);
    if (item === undefined) {
      // for new sort attempt to guess preferred sort direction based on column description
      let obj = default_sort_direction.find(item => item.sort_column === dataset.clicked);
      let dir = dir_desc;
      if (obj !== undefined) {
        dir = obj.dir;
      }
      a.push( { sort_column:dataset.clicked, dir:dir } );  // add sort option
    } else {
      item.dir *= -1;  // invert sort option
    }
  }
  ///save_hist = (dataset[type_str] != current_type);  // TODO: fix and enable this !
  navigate_to(obj, save_hist);
}

function mouseup_handler(e) {
  if (e.button != 2) {
    return;
  }
  let dataset = e.target.dataset;
  if (dataset.clicked === undefined) {
    return;
  }
  let obj = object_from_dataset(dataset);
  let a = obj[sort_type(dataset[type_str])];
  const index = a.findIndex(item => item.sort_column === dataset.clicked);
  if (index >= 0) {
    a.splice(index, 1);  // remove sort option
  } else {  // nothing to remove, don't redraw
    return;
  }
  navigate_to(obj);
}

function object_from_searchparams(params) {
  let obj = new Object();
  for (const p of params) {
    obj[p[0]] = p[1];
  }
  return restore_object(obj);
}

function object_from_dataset(dataset) {
  let obj = new Object();
  for (const p in dataset) {
    obj[p] = dataset[p];
  }
  return restore_object(obj);
}

/* Converts from object to dataset and attaches dataset to provided element */
function dataset_from_object(el, obj) {
  Object.keys(obj).forEach(key => {
    if (keys_to_parse.includes(key)) {
      el.dataset[key] = JSON.stringify(obj[key]);
    } else {
      el.dataset[key] = obj[key];
    }
  });
}

function restore_object(obj) {
  for (const key in obj) {
    if (keys_to_parse.includes(key)) {
      obj[key] = JSON.parse(obj[key]);
    } else if (keys_to_erase.includes(key)){
      delete obj[key];
    }
  }
  for (let k of keys_to_init) {
    if (obj[k] === undefined) {
      obj[k] = '';
    }
  }
  return obj;
}
/*
function stringify_object(obj) {
  for (const key in obj) {
    if (keys_to_parse.includes(key)) {
      obj[key] = JSON.stringify(obj[key]);
    }
  }
  return obj;
}
*/
function navigate_to(obj, save_history) {
  if (obj === null) {
    obj = object_from_searchparams(  (new URL(document.location)).searchParams  );
  }
  const loc = window.location.pathname + expand_params(obj);
  if (save_history) {
    history.pushState(obj, 'page x', loc);
  } else {
    window.onpopstate = function (ev) {  };
    history.replaceState(obj, 'page x', loc);
    window.onpopstate = function (ev) { navigate_to(ev.state); };
  }
  navigate_noadd_history(obj);

  // TODO: properly preserve position
  if (save_history) {
    window.scrollTo(0, 0);
  }
}

function expand_params(obj) {
  if (obj === undefined || obj === null) {
    return '';
  }
  let str = '?';
  for (const key of Object.keys(  /*stringify_object*/(obj)  )) {
    if (keys_to_parse.includes(key)) {  // TODO: fix this duplication
      str += `${key}=${JSON.stringify(obj[key])}&`;
    } else {
      str += `${key}=${obj[key]}&`;
    }
  }
  str = str.slice(0, -1);
  return str;
}

async function navigate_noadd_history(o) {
  let fragment = document.createDocumentFragment();
  //document.getElementById(all_list_id).innerHTML = 'Loading, please wait...';

  // TODO: deduplicate with notice on main page
  const break_date = new Date('2018-10-16T00:00:00-0800');
  const fix_date = new Date('2019-10-22T00:00:00-0800');
  let sec = msec_to_sec(fix_date - break_date);
  let days = ~~(sec/secs_in_day);
  let warn_div = document.createElement('div');
  warn_div.innerHTML = '<b>UPDATES ARE PAUSED for 1-3 days</b><br>pending addition of IOP special orders';
  css_class_add(warn_div, css_class_fixed);
  //fragment.appendChild( warn_div );  // orders are done, hide the notice

  // BIG TODO: recipes and epoch selectors should take table type(gun/equ), not item type(tdoll/equip/fairy)
  switch (o[type_str]) {
    case tdoll_str        : fragment.appendChild( await create_epoch_selector(tdoll_str, o) ); fragment.appendChild( await create_single_item_table(tdoll_str, o) );  break;
    case equip_str        : fragment.appendChild( await create_epoch_selector(equip_str, o) ); fragment.appendChild( await create_single_item_table(equip_str, o) );  break;
    case fairy_str        : fragment.appendChild( await create_epoch_selector(fairy_str, o) ); fragment.appendChild( await create_single_item_table(fairy_str, o) );  break;

    case tdoll_recipe_str : fragment.appendChild( await create_epoch_selector(tdoll_str, o) ); fragment.appendChild( await create_single_recipe_table(tdoll_str, o) ); break;
    case equip_recipe_str : fragment.appendChild( await create_epoch_selector(equip_str, o) ); fragment.appendChild( await create_single_recipe_table(equip_str, o) ); break;
    case fairy_recipe_str : fragment.appendChild( await create_epoch_selector(fairy_str, o) ); fragment.appendChild( await create_single_recipe_table(fairy_str, o) ); break;

    case tdoll_list_str   : fragment.appendChild( await create_epoch_selector(tdoll_str, o) ); fragment.appendChild( await create_list_table(main[tdoll_str], tdoll_str, true,  o) ); break;
    case equip_list_str   : fragment.appendChild( await create_epoch_selector(equip_str, o) ); fragment.appendChild( await create_list_table(main[equip_str], equip_str, false, o) ); break;
    case fairy_list_str   : fragment.appendChild( await create_epoch_selector(fairy_str, o) ); fragment.appendChild( await create_list_table(main[fairy_str], fairy_str, false, o) ); break;

    default               : fragment.appendChild( await create_epoch_selector(tdoll_str, o) ); fragment.appendChild( await create_list_table(main[tdoll_str], tdoll_str, true,  o) );
                            fragment.appendChild( document.createElement('hr') );
                            fragment.appendChild( await create_epoch_selector(equip_str, o) ); fragment.appendChild( await create_list_table(main[equip_str], equip_str, false, o) );
                            fragment.appendChild( document.createElement('hr') );
                            fragment.appendChild( await create_epoch_selector(fairy_str, o) ); fragment.appendChild( await create_list_table(main[fairy_str], fairy_str, false, o) );
                            break;
  }

  set_page_title(o);
  document.getElementById(all_list_id).innerHTML = '';
  document.getElementById(all_list_id).appendChild(fragment);
}

async function create_epoch_selector(itemclass, o) {
  const ep_map = main[epoch_str][urlpart_from_itemclass(itemclass)];
  const ep_len = ep_map.size;
  const cur_seconds = msec_to_sec(new Date().getTime());
  let ep_ptr;
  if (o[ep_num(itemclass)] === undefined) {
    o[ep_num(itemclass)] = ep_map.keys().next().value;
    ep_ptr = ep_map.get(o[ep_num(itemclass)]);
    while (ep_ptr.next !== undefined && ep_ptr.next.start < cur_seconds) {
      ep_ptr = ep_ptr.next;
    }
  } else {
    ep_ptr = ep_map.get(o[ep_num(itemclass)]);
  }
  o[ep_num(itemclass)] = epoch_merge(ep_ptr.epkey, ep_ptr.subkey);

  let tbl = document.createElement('table');
  let tbody = tbl.appendChild(document.createElement('tbody'));

  let tr1 = tbody.insertRow();
  let tr2 = tbody.insertRow();
  let left = tr1.insertCell();
  let right = tr1.insertCell();  // tr1 is correct here
  left.innerHTML = '&nbsp; < &nbsp;';
  right.innerHTML = '&nbsp; > &nbsp;';
  css_class_add(left,  css_class_noselect);
  css_class_add(right, css_class_noselect);

  let val1 = ep_ptr.start;
  let val2 = ep_ptr.next;   // TODO: fix type

  if (val2 === undefined) {
    val2 = msec_to_sec(MAX_DATE);
  } else {
    val2 = val2.start;
  }
  create_epochmenu_helper_fn(left,  o, ep_ptr.prev, itemclass);
  create_epochmenu_helper_fn(right, o, ep_ptr.next, itemclass);
  left.rowSpan = 2;
  right.rowSpan = 2;
  tr1.insertCell().innerHTML = my_date_format(val1);
  tr2.insertCell().innerHTML = my_date_format(val2);

  let urlpart = urlpart_from_itemclass(itemclass);
  let cap_ratio_str = '';
  const info = await download_json(`./${stat_dir}/${urlpart}/${ep_ptr.epkey}/info`);
  let count;
  let delta;
  let capture_ratio;
  let title;
  if (info !== undefined) {
    count = info[urlpart + '_count'];
    delta = info[urlpart + '_delta'];
    capture_ratio = (magnification*count/delta).toFixed(2);
    title = `${my_format_with_spaces(delta)} total\n${my_format_with_spaces(count)} captured`;
  }
  if (isNaN(capture_ratio)) {
    capture_ratio = '??.??';
    title = '';
  }
  let cr = tr1.insertCell();
  cr.rowSpan = 2;
  cr.innerHTML = /* `<span>ep ${o[ep_num(itemclass)]}</span><br>*/ `<span title="${title}">CR ${capture_ratio}</span>`;

  tbl.appendChild(tr1);
  tbl.appendChild(tr2);
  if (val2 <= cur_seconds) {
    css_class_add(tbl, css_class_past);
  } else if (cur_seconds < val1) {
    css_class_add(tbl, css_class_future);
  } else /*if (val1 <= cur && cur < val2)*/ {
    css_class_add(tbl, css_class_present);
  }
  return tbl;
}

function msec_to_sec(msec) {
  return msec/1000;
}

function sec_to_msec(sec) {
  return sec*1000;
}

function create_epochmenu_helper_fn(el, o, new_ep, itemclass) {
  if (new_ep === undefined) {
    css_class_add(el, css_class_zero_opac);
  } else {
    css_class_add(el, css_class_finger);
    ///Object.keys(o).forEach(key => el.dataset[key] = o[key]);
    dataset_from_object(el, o);
    el.dataset[ep_num(itemclass)] = epoch_merge(new_ep.epkey, new_ep.subkey);

    set_mouse_event_handlers(el);
  }
}

function epoch_string(o, itemclass) {
  return epoch_split_main(o[ep_num(itemclass)]);
}
function epoch_merge(main, sub) {
  return main + epoch_separator + sub;
}
function epoch_split_main(merged) {
  return merged.split(epoch_separator)[0];
}
function epoch_split_sub(merged) {
  return merged.split(epoch_separator)[1];
}

async function create_single_item_table(itemclass, o) {
  const mcontainer = main[itemclass].map;
  const self_datatype = itemclass;
  let urlpart = urlpart_from_itemclass(itemclass);
  let sort_opt_id = itemclass;
  let item_cname = itemclass;
  let datatype;
  switch (itemclass) {
    case tdoll_str:
      datatype = tdoll_recipe_str;
      break;
    case equip_str:
      datatype = equip_recipe_str;
      break;
    case fairy_str:
      datatype = fairy_recipe_str;
      break;
    default: throw new Error('Wrong item class in item table.');
  }
  const json = await download_json(`./${stat_dir}/${urlpart}/${epoch_string(o, itemclass)}/${item_cname}_id/${o[id_str]}`);  // TODO: remove "_id" suffix literal
  const items = ((json === undefined) ? [] : json);
  const len = items.length;
  for (let i = 0; i < len; i++) {
    let item = items[i];
    attach_bayes_est(item, item[count_str], item[total_str]);
    /*attach_expect_est(item);*/
    item[type_str] = datatype;
    item[ep_num(self_datatype)] = o[ep_num(self_datatype)];  // TODO: was this complexity really necessary?
  }
  items.sort(comparer_function(o[sort_type(self_datatype)]));
  const table_header = `Recipes for ${item_cname} ${mcontainer.get(o[id_str])[name_str]} (id=${o[id_str]}, timer=${mcontainer.get(o[id_str])[craft_time_str]}, epoch=${o[ep_num(self_datatype)]})`;  // , min.total=?
  const column_names = [mp_str, ammo_str, mre_str, part_str, tier_str, count_str, total_str, mean_str, stdev_str];
  const dataset      = [mp_str, ammo_str, mre_str, part_str, tier_str, type_str, ep_num(self_datatype)          ];
  const self_dataset = o;
  return create_single_generic_table(css_class_recipelist, table_header, column_names, items, dataset, self_datatype, self_dataset, null);
}

async function create_single_recipe_table(itemclass, o) {
  const table_class = itemclass + 'list';
  let urlpart = urlpart_from_itemclass(itemclass);
  let item_id_str;
  let item_cname;
  let self_datatype;
  switch (itemclass) {
    case tdoll_str:
      self_datatype = tdoll_recipe_str;
      item_cname    = 'Dolls';
      break;
    case equip_str:
      self_datatype = equip_recipe_str;
      item_cname    = 'Equips';
      break;
    case fairy_str:
      self_datatype = fairy_recipe_str;
      item_cname    = 'Fairies/Equips';
      break;
    default     : throw new Error('Wrong item class in recipe table.');
  }
  const recipe = `${o[mp_str]}-${o[ammo_str]}-${o[mre_str]}-${o[part_str]}-${o[tier_str]}`;
  const json = await download_json(`./${stat_dir}/${urlpart}/${epoch_string(o, itemclass)}/recipe/${recipe}`);
  const items = ((json === undefined) ? [] : json.data);
  const total = ((json === undefined) ? 0 : json[total_str]);  // TODO: fix -- undefined does not mean 0, just less than threshold!
  const len = items.length;
  let rarestat = ((json === undefined) ? null : [0,0,0,0,0,0,0]);
  for (let i = 0; i < len; i++) {
    let item = items[i];
    let mcontainer;
    if (item['tdoll_id'] > 0) {  // TODO: refactor this shit
      item[type_str] = 'tdoll';
      item_id_str = 'tdoll_id';
      mcontainer = main[tdoll_str].map;
    } else if (item['equip_id'] > 0) {
      item[type_str] = 'equip';
      item_id_str = 'equip_id';
      mcontainer = main[equip_str].map;
    } else if (item['fairy_id'] > 0) {
      item[type_str] = 'fairy';
      item_id_str = 'fairy_id';
      mcontainer = main[fairy_str].map;
    } else {
      throw new Error('Cannot find proper id // TODO');
    }
    const id = item[item_id_str].toString();
    item[id_str]         = id;
    item[rarity_str]     = mcontainer.get(id)[rarity_str];
    item[class_str]      = mcontainer.get(id)[class_str];
    item[name_str]       = mcontainer.get(id)[name_str];
    item[craft_time_str] = mcontainer.get(id)[craft_time_str];
    attach_bayes_est(item, item[count_str], total);
    rarestat[item[rarity_str]] += item[count_str];
    item[ep_num(itemclass)] = o[ep_num(itemclass)];  // TODO: was this complexity really necessary?
  }

  if (rarestat !== null) {
    for (let i = 0; i < rarestat.length; i++) {
      if (rarestat[i] == 0) {  // we assume that 0 means genuinely absent category, not just 0 items by chance
        rarestat[i] = null;
      } else {
        let tmpo = new Object();
        attach_bayes_est(tmpo, rarestat[i], total);
        rarestat[i] = tmpo;
      }
    }
  }
  items.sort(comparer_function(o[sort_type(self_datatype)]));
  const table_header = `${item_cname} from ${recipe}, epoch recipe total: ${my_format_with_spaces(total)}`;
  const column_names = [id_str, rarity_str, class_str, name_str, craft_time_str, count_str, mean_str, stdev_str];
  const self_dataset = o;
  const dataset      = [id_str, type_str, ep_num(itemclass)];
  return create_single_generic_table(table_class, table_header, column_names, items, dataset, self_datatype, self_dataset, rarestat);
}

async function download_json(url) {
  try {
    const response = await fetch(url, fetch_options);
    let json = JSON.parse(await response.text());
    //console.log("fetching " + url + " OK");
    return json;
  } catch (e) {
    //console.log("fetching " + url + " FAILED");
    //let loading = 'Loading ' + url + ' failed with exception: ' + e.message;
    //document.getElementById(all_list_id).innerHTML = loading;
  }
}

function create_single_generic_table(table_class, table_name, column_names, content, dataset, self_datatype, self_dataset, rarity_stats) {
  let tbl = document.createElement('table');
  let tbody = tbl.appendChild(document.createElement('tbody'));
  css_class_add(tbl, table_class);

  let ti = tbody.insertRow();
  fill_info(ti, table_name, column_names.length);

  if (rarity_stats !== null) {
    let ts = tbody.insertRow();
    let rare_str = '';
    for (let i = 0; i <= rarity_list.length; i++) {
      if (rarity_stats[i] != null) {  // we use assumption about 0 in rarity stats (see above)
        rare_str += `<span class="padlr rarity${i}">${rarity_stats[i][mean_str]}±${rarity_stats[i][stdev_str]}</span>`;
      }
    }
    fill_info(ts, rare_str, column_names.length);
  }

  let th = tbody.insertRow();
  css_class_add(th, css_class_finger);
  fill_header(th, column_names, self_datatype, self_dataset);

  const len = content.length;
  for (let i = 0; i < len; i++) {
    let tr = tbody.insertRow();
    css_class_add(tr, css_class_finger);
    css_class_add(tr, css_class_bg_on_hover);
    fill_table_row(tr, content[i], column_names, dataset);
  }
  set_mouse_event_handlers(tbl);
  return tbl;
}

function fill_info(ti, info, colspan) {
  css_class_add(ti, css_class_header);
  let cell = ti.insertCell();
  cell.innerHTML = info;
  cell.colSpan = colspan;
}

function fill_header(th, content, self_datatype, self_dataset) {
  css_class_add(th, css_class_header);
  css_class_add(th, css_class_noselect);
  const content_len = content.length;
  const super_len = super_index.length;
  let sort_opts = self_dataset[sort_type(self_datatype)];
  if (sort_opts === undefined) {
    sort_opts = [];
  }
  for (let i = 0; i < content_len; i++) {
    let cell = th.insertCell();
    cell.innerHTML = content[i];
    cell.dataset[type_str] = self_datatype;
    const index = sort_opts.findIndex(item => item.sort_column == content[i]);
    if (index != -1) {
      const index_text = (index+1 > super_len ? (index+1).toString() : super_index[index]);
      switch (sort_opts[index].dir) {
        case dir_desc: cell.innerHTML += "▼" + index_text; break;
        case dir_asc : cell.innerHTML += "▲" + index_text; break;
        default: throw new Error('Unrecognized sort option in fill_header');
      }
    } else {
      cell.innerHTML += '&nbsp;<span class="zero-opacity zero-margin-padding">▼' + super_index[0] + '</span>';  // invisible spacer to reserve place to avoid column-table resize
    }
    ///Object.keys(self_dataset).forEach(key => cell.dataset[key] = self_dataset[key]);
    dataset_from_object(cell, self_dataset);
    cell.dataset[sort_type(self_datatype)] = JSON.stringify(sort_opts);  // TODO: look for the proper way to do it
    cell.dataset.clicked = content[i];
  }
}

function fill_table_row(tr, item, props, dataset) {
  const len = props.length;
  for (let i = 0; i < len; i++) {
  /*if (props[i] == 'canvas') {
      let cell = tr.insertCell();
      draw_distribution(cell, {mean:Number(item[mean_str]), stdev:Number(item[stdev_str]), a:item[count_str], b:item[total_str]});
    } else*/ {
      tr.insertCell().innerHTML = (item[props[i]] === undefined ? '' : item[props[i]]);
    }
  }
  for (const key of dataset) {
    tr.dataset[key] = item[key];
  }
}

function is_item_showable(el, cur_epoch) {
  return (el !== undefined && is_item_time_ok(el, cur_epoch) && is_item_craftable(el));
}

function is_item_time_ok(el, cur_epoch) {
  const key = epoch_str;
  return (el[key] !== undefined && cur_epoch >= el[key]);  // TODO: cur_epoch is now string like 'ep12.34', so do something with comparison
}

function is_item_craftable(el) {
  const key = craft_time_str;
  return (el[key] !== undefined && el[key] != '');
}

function add_vertical_border(el) {
  el.classList.add('bold_vert_border');
}

function add_horizontal_border(el) {
  el.classList.add('bold_horz_border');
}

function create_array(length) {
  let arr = new Array(length || 0);
  let i = length;
  if (arguments.length > 1) {
    let args = Array.prototype.slice.call(arguments, 1);
    while (i--) {
      arr[length-1 - i] = create_array.apply(this, args);
    }
  }
  return arr;
}

function max_length(arr) {
  let max_len = 0;
  for (let i = 0; i < arr.length; i++) {
    max_len = Math.max(max_len, arr[i].length);
  }
  return max_len;
}

function indexof_class(classtype, class_list) {
  return class_list.indexOf(classtype);
}

function indexof_rarity(rarity) {
  return rarity_list.indexOf(rarity);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function on_global_keypress(event) {
  switch (event.key) {
    case '`': /* open/close menu */ break;
    default: 
  }
}

function comparer_function(arr) {
  return function(a,b) {
    if (arr === undefined) {
      return 0;
    }
    const len = arr.length;
    for (let i = 0; i < len; i++) {
      const x = arr[i];
      let left  = Number(a[x.sort_column]);
      let right = Number(b[x.sort_column]);
      if (isNaN(left) || isNaN(right)) {  // string comparison is used for [name, craft time, class] columns
        left  = a[x.sort_column];
        right = b[x.sort_column];
      }
      if (left < right) { return  1*x.dir; }
      if (left > right) { return -1*x.dir; }
    }
    return 0;
  }
}

function set_mouse_event_handlers(item) {
  item.onclick = click_handler;
  item.onmouseup = mouseup_handler;
  item.oncontextmenu = function(e) { e.preventDefault(); e.stopPropagation(); };
  // oncontextmenu works only most of the time, see comment with "preventDefault()" in the beginning
}

function attach_bayes_est(item, count, total) {
  // using uniform prior because why not
  const a = 1.0 + count;
  const b = 1.0 + total - count;
  item[mean_str]  = ( magnification * posterior_mean(a,b)  ).toFixed(precision);
  item[stdev_str] = ( magnification * posterior_stdev(a,b) ).toFixed(precision);
  //item[relvar_str] = (item[mean_str] / item[stdev_str]).toFixed(precision);
}

function posterior_mean(a, b) {
  return (a / (a + b));
}

function posterior_stdev(a, b) {
  return Math.sqrt( a*b / ((a+b)*(a+b) * (a+b+1)) );
}

function css_class_add(el, class_name) {
  if (class_name instanceof Array) {
    const len = class_name.length;
    for (let i = 0; i < len; i++) {
      el.classList.add(class_name[i]);
    }
  } else {
    el.classList.add(class_name);
  }
}

function css_class_remove(el, class_name) {
  el.classList.remove(class_name);
}
function my_date_format(seconds) {
  const d = new Date(sec_to_msec(seconds));
  if (d.getTime() == MAX_DATE) {
    return '&nbsp;';
  } else {
    return d.getFullYear() + "-"
      + ("0" + (d.getMonth()+1)).slice(-2) + "-"
      + ("0" + d.getDate()).slice(-2) + " "
      + ("0" + d.getHours()).slice(-2) + ":"
      + ("0" + d.getMinutes()).slice(-2) + ":"
      + ("0" + d.getSeconds()).slice(-2);
  }
}

function ep_num(itemclass) {
  return 'epoch.' + itemclass;
}
function sort_type(itemclass) {
  return 'sort.' + itemclass;
}

function set_page_title(o) {
  let title = "GFDB EN";  //TODO: sync title with html page somehow
  if (o !== null && o[type_str] !== undefined) {
    const type = o[type_str];
    switch (type) {
      case tdoll_str:
      case equip_str:
      case fairy_str:
        title = `${main[type].map.get(o[id_str])[name_str]} [${o[ep_num(type)]}]`;
        break;
      case tdoll_recipe_str:
      case equip_recipe_str:
      case fairy_recipe_str:
        title = `${type.slice(0,1)} ${o[mp_str]}-${o[ammo_str]}-${o[mre_str]}-${o[part_str]}`;  // TODO: shouldn't we also add epoch here?
        if (o[tier_str] != 0) {
          title += ` T${o[tier_str]}`;
        }
        break;
      case null: // TODO: what is this for?
        break;
      default: // TODO: do nothing?
    }
  }
  document.title = title;
}

function my_format_with_spaces(input) {
  return format_with_spaces(input, 3);
}

function format_with_spaces(input, part_len) {
  const spacer = ' ';
  const s = input.toString();
  const slen = s.length;
  let out = '';
  let end = slen;
  let start;
  do {
    start = Math.max(0, end - part_len);
    out = s.substring(start, end) + spacer + out;
    end -= part_len;
  } while( start > 0 );
  return out.trim();
}


function urlpart_from_itemclass(itemclass) {
  switch (itemclass) {
    case tdoll_str: return gun_str;
    case equip_str: return equ_str;
    case fairy_str: return equ_str;
    default: throw new Error('Unrecognized itemclass value');
  }
}

function contract_from_tier(tier) {
  switch (tier) {
    case 0: return 1;
    case 1: return 1;
    case 2: return 20;
    case 3: return 50;
    default: throw new Error('Unrecognized tier value');
  }
}

// Functions block end.