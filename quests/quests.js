'use strict';
const localstorage_page_prefix = 'quests_';

const quest_list_id  = 'quest_list';
let o = new Object();
o.props = [];
o.dailies = new Map();
o.weeklies = new Map();
let mark = -1;  // index of feature to highlight non-zero rows
const first_numbers = 3;  // skip sum for cols less than this
const first_highlight = 7;  // skip highlight for cols less than this

const entity_separator = '\n';
const field_separator = ',';
const csv_filename = './quests.csv';


async function init() {
  const data = await fetch(csv_filename);
  o = parse_text(await data.text());
  update();
}

function parse_text(textstr) {
  let strings = textstr.split(entity_separator);
  let len = strings.length;
  let rv = new Object();
  rv.props = strings[0].split(field_separator);
  rv.titles = strings[1].split(field_separator);
  let tmp = new Map();
  for (let i = 2; i < len; i++) {  // skip lines 0 and 1 for props and their full titles, respectively
    let a = strings[i].split(field_separator);
    if (tmp.get(a[0]) != undefined) {  // on repeating id change from dailies to weeklies
      rv.dailies = new Map(tmp);
      tmp = new Map();
    }
    if (a.length == rv.props.length) {
      let key = a[0];
      let value = new Object();
      for (let j = 0; j < rv.props.length; j++) {
        value[rv.props[j]] = a[j];
      }
      tmp.set(key, value);
    }
  }
  rv.weeklies = new Map(tmp);
  return rv;
}

function update() {
  recreate_quest_table(o);
}

function recreate_quest_table(a) {
  document.getElementById(quest_list_id).innerHTML = '';
  let tbl = document.createElement('table');
  let tbody = tbl.appendChild(document.createElement('tbody'));

  insert_rows(tbody, a.props, a.dailies);
  insert_sum (tbody, a.props, a.dailies, 1);
  insert_head(tbody, a.props, a.titles);
  insert_sum (tbody, a.props, a.weeklies, 7);
  insert_rows(tbody, a.props, a.weeklies);

  document.getElementById(quest_list_id).appendChild(tbl);
}

function insert_rows(body, props, map) {
  for (let [key, value] of map.entries()) {
    let tr = body.insertRow();
    let row_mark = false;
    let len = props.length;
    for (let j = 0; j < len; j++) {
      let cell = tr.insertCell();
      cell.appendChild(document.createTextNode(value[props[j]]));
      if (j == mark && value[props[j]] != "") {
        row_mark = true;
        cell.classList.add('selected_cell');
      }
    }
    if (row_mark) {
      tr.classList.add('selected_row');
    }
  }
}

function insert_sum(body, props, map, div) {
  let tsum = body.insertRow();
  let round_digits = 1;
  let pw = Math.pow(10, round_digits);
  tsum.classList.add('header_bg');
  for (let j = 0; j < props.length; j++) {
    let sum = 0;
    for (let [key, value] of map.entries()) {
      sum += Number(value[props[j]]);
    }
    sum = Math.round(pw*sum/div)/pw;
    if (j < first_numbers) {  // a hack to skip summing text parts
      sum = "";
    }
    tsum.insertCell().appendChild(document.createTextNode(sum));
  }
}

function insert_head(body, props, titles) {
  let th = body.insertRow();
  th.classList.add('bold', 'header_bg');
  for (let j = 0; j < props.length; j++) {
    let cell = th.insertCell();
    cell.appendChild(document.createTextNode(props[j]));
    cell.title = titles[j];
    if (j > first_highlight) {  // a hack to skip highlight-enabling cols with most cells filled (before cmdr_exp)
      cell.addEventListener('click', create_fn_onclick_see_id(j), false);
      cell.classList.add('selectable');
    }
  }

}

function create_fn_onclick_see_id(x) {
  return function() { onclick_see_id(x); };
}

function onclick_see_id(x) {
  if (mark == x) {
    mark = -1;
  } else {
    mark = x;
  }
  update();
}
