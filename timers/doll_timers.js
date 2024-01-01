'use strict';
const localstorage_page_prefix = 'timers_';

const all_list_id = 'all_list';
const class_list  = ['HG', 'SMG', 'AR', 'RF', 'MG', 'SG'];
const rarity_list = ['5', '4', '3', '2', '1'];

let main_obj = new Object();

const entity_separator = '\n';
const field_separator = ',';


async function init() {
  const data = await fetch('../gfdb/table_info-tdoll.csv');
  main_obj = parse_text(await data.text());
  update();
}

function parse_text(textstr) {
  let strings = textstr.split(entity_separator);
  let props = strings[0].split(field_separator);
  let map = new Map();

  let vert_len = strings.length;
  let prop_len = props.length;
  for (let i = 1; i < vert_len; i++) {
    let a = strings[i].split(field_separator);
    if (a.length > 1 && a.length == prop_len) {
      let key = a[1];  // here key is build time
      if (key == '') {
        continue;
      }
      if (map.get(key) == undefined) {
        map.set(key, []);
      }
      let obj = new Object();
      for (let j = 0; j < prop_len; j++) {
        obj[props[j]] = a[j];
      }
      map.get(key).push(obj);
    }
  }
  for (let [key, value] of map.entries()) {
    value.sort( function(a, b) { return class_list.indexOf(a['class']) - class_list.indexOf(b['class']) } );
  }
  let retval = new Object();
  retval.map = new Map([...map.entries()].sort());
  retval.props = props;
  return retval;
}

function update() {
  recreate_all_table(main_obj);
}

function recreate_all_table(a) {
  let container = document.getElementById(all_list_id);
  let tbl = document.createElement('table');
  let tbody = tbl.appendChild(document.createElement('tbody'));

  container.innerHTML = '';
  tbl.classList.add('selectable');
  for (let [key, value] of a.map.entries()) {
    let tr = tbody.insertRow();
    let str = "";
    tr.insertCell().appendChild(document.createTextNode(key));  // timer
    for (let i = 0; i < value.length; i++) {
      str += "<span class='rarity" + value[i]['*'] + "'><span class='sup'>" + value[i]['class'] + " </span>" + value[i]['name'] + "</span>, ";
    }
    tr.insertCell().innerHTML = str.slice(0, -2);  // names with last space and comma stripped
  }
  container.appendChild(tbl);
  tbl.classList.add('multi-column-table');
}
