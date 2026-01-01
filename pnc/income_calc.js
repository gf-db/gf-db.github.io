'use strict';
const localstorage_page_prefix = 'pnc_income_calc_';

const main_container_id = 'main_list';
const main_table_id     = 'main_table';
const img_path          = "./img/";
let o = new Object();

const double_newline      = '\n\n';
const single_newline      = '\n';
const multiples_char      = 's';
const space               = ' ';
const equal_sign          = '=';
const comment_sign        = ';';
const exclamation_sign    = '!';
const csv_filename        = './input_data.txt';
const separator_line      = '---';
const remaining_ind       = "REMAINING";  // indicator to use all remaining resource of this type
const REMAINING           = Infinity;  // TODO: hack

async function init() {
  const data = await fetch(csv_filename);
  o = parse_text_config(await data.text());
  create_tables(o);
  update_tables(o);
}

function deinit() {
}

function map_add(map, key_name, add_value) {
  let x = map.get(key_name);
  if (isNaN(x) || x === undefined) {
    x = 0;
  }
  x += add_value;
  map.set(key_name, x);
}

function trim_tail(str, ch) {
  let end = str.length;
  while(end > 0 && str[end-1] === ch) {
    --end;
  }
  if (end < str.length) {
    return str.substring(0, end);
  } else {
    return str;
  }
}

function parse_single_block(props, block, sources) {
  const lines = block.split(single_newline);
  let obj = new Object();
  if (lines[0][0] == comment_sign) {
    obj.comment = true;
    return obj;
  }
  if (lines[0] == separator_line && lines.length == 1) {
    obj.separator = true;
    return obj;
  }
  if (lines[0][0] == exclamation_sign) {
    obj.doll_needs = true;
    obj.textname = lines[0].split(/!\t(.*)/)[1];  // TODO
  }
  const regex = /[\t|]*([^\]]*?)\s\[(.*)\]/;
  const [placeholder, name, period] = lines[0].split(regex);
  obj.duty_cycle = 1;
  let map = new Map();
  for (const line of lines.slice(1)) {
    if (line.includes(equal_sign)) {
      const value = line.substring(line.indexOf(equal_sign)+1);
      const key = line.substring(0, line.indexOf(equal_sign));
      switch (key) {
        case "group": obj.group = value;
        case "ddc": obj.duty_cycle = Number(value);
        case "include": sources.doll_needs.forEach( (item,index,arr) => { if (item.textname == value) { map = new Map(item.map); } } );
      }
      continue;
    }
    let key = line.substring(line.indexOf(space)+1);
    const value = eval( line.substring(0, line.indexOf(space)) );
    if (!props.includes(key)) {
      key = trim_tail(key, space)
      key = trim_tail(key, multiples_char)
    }
    if (!props.includes(key)) {
      console.log( "Unrecognized item type : " + key );
    }
    if (key == remaining_ind) {
      value = Infinity;
    }
    map_add(map, key, value)
  }
  obj.period = eval(period);
  obj.name = name;
  obj.map = map;
  return obj;
}

function parse_text_config(textstr) {
  // should've used a json or something...
  const strings = textstr.split(double_newline);
  let rv = new Object();
  let props = new Array();
  for (const s of strings[0].split(single_newline)) {
    if (!s.startsWith("\t")) {
      props.push(s);
    }
  }
  rv.props = props;

  let sources = new Array();
  sources.doll_needs = new Array();
  for (const block of strings.slice(1)) {
    let obj = parse_single_block(props, block, sources);
    if (obj.comment) {
      continue;
    }
    if (obj.separator) {
      sources[sources.length-1].border = true;
      continue;
    }
    if (obj.doll_needs) {
      sources.doll_needs.push(obj);
      continue;
    }
    sources.push( obj );
  }
  rv.sources = sources;
  return rv;
}

function update() {
  update_tables(o);
}

function create_tables(a) {
  let main = document.getElementById(main_container_id);
  main.innerHTML = '';
  let tbl, tbody;
  tbl = document.createElement('table');
  tbl.id = main_table_id;
  tbl.classList.add('float_left');
  tbody = tbl.appendChild(document.createElement('tbody'));
  insert_head(tbody, a.props);
  insert_rows(tbody, a.props, a.sources);
  main.appendChild(tbl);
}

function update_tables(a) {
  update_rows(document.getElementById(main_table_id), a.props, a.sources);
}

function insert_head(body, props) {
  let th = body.insertRow();
  th.classList.add('header_bg');
  th.classList.add('bold_bottom_border');

  th.insertCell().appendChild(document.createTextNode(""));
  let text = document.createElement("p");
  text.innerHTML = "USE"
  th.insertCell().appendChild(text);

  for (const prop of props) {
    let img = document.createElement('img');
    img.src = img_path + prop + ".png";
    img.title = prop;
    img.classList.add('resource_icon');
    th.insertCell().appendChild(img);
  }
}

function period_norm(value, power) {
  const period_days = 7;
  if (power === undefined) { power = 1; }
  const norm = Math.pow(period_days, power);
  const trunc_factor = 100;  // TODO : significant digit rounding
  return Math.round(value * trunc_factor * norm)/trunc_factor;
}

function insert_rows(body, props, lines) {
  let tr, cell;
  for (const line of lines) {
    tr = body.insertRow();
    if (line.border == true) {
      body.lastChild.classList.add('bold_bottom_border');
    }
    cell = tr.insertCell();
    cell.appendChild(document.createTextNode(line.name));
    cell.classList.add('selectable');

    //tr.insertCell().appendChild(document.createTextNode(line.duty_cycle));
    cell = tr.insertCell();
    let input = document.createElement('input');
    input.min = 0;
    input.max = 1;
    input.step = 0.001;
    input.value = line.duty_cycle;
    cell.appendChild(input);

    for (const prop of props) {
      tr.insertCell();
    }
  }
  body.lastChild.classList.add('bold_bottom_border');

  let rows = [ body.insertRow() ];
  rows[0].insertCell().appendChild(document.createTextNode("TOTAL increase [rsc/week]"));
  //rows[0].classList.add('bold_bottom_border');
  let row;
  for (const item of lines.doll_needs) {
    row = body.insertRow();
    row.insertCell().appendChild(document.createTextNode(item.textname + " [rsc]"));
    rows.push(row);

    row = body.insertRow();
    row.insertCell().appendChild(document.createTextNode(item.textname + " [weeks]"));
    //row.classList.add('bold_bottom_border');
    rows.push(row);
  }
  for (let r of rows) {
    r.insertCell(); // usage text column (empty)
    for (const prop of props) {
      r.insertCell();
    }
  }
}

function update_rows(body, props, lines) {
  let totals = new Map();
  let cell_num = 2; // starts from 2, skip text and weight
  for (const prop of props) {
    let line_num = 1; // starts from 1, skip header
    for (const line of lines) {
      let value = "";
      const v = line.map.get(prop);
      if (v !== undefined) {
        let exact_value;
        if (v == Infinity) {  // todo: remaining could be not the last; move this out of here into separate loop
          exact_value = -totals.get(prop);
        } else {
          exact_value = v / line.period * line.duty_cycle;
        }
        map_add(totals, prop, exact_value);
        value = period_norm(exact_value);
      }
      body.firstChild.childNodes[line_num].childNodes[cell_num].innerHTML = value;
      line_num++;
    }

    let printed_x = "", printed_y = "", printed_z = "";
    let x = totals.get(prop);
    if (x !== undefined) {
      printed_x = period_norm(x);
    }
    body.firstChild.childNodes[line_num].childNodes[cell_num].innerHTML = printed_x;
    for (const i in lines.doll_needs) {
      let y = lines.doll_needs[i].map.get(prop);
      if (y !== undefined) {
        printed_y = y;
      }
      if (x !== undefined && y !== undefined) {
        printed_z = period_norm(y / x, -1);  // TODO
      }
      body.firstChild.childNodes[line_num+2*i+1].childNodes[cell_num].innerHTML = printed_y;
      body.firstChild.childNodes[line_num+2*i+2].childNodes[cell_num].innerHTML = "<b>" + printed_z + "</b>";
      body.firstChild.childNodes[line_num+2*i+2].childNodes[cell_num].style = colored_bg(printed_z);
    }
    cell_num++;
  }
}

function colored_bg(value) {
  if (value === undefined || value === "") { return ""; }
  const value_min = 0;
  const value_max = 2.4;  // empirical find based on given numbers; might change
  const hue_range = 120;
  const hue = Math.max(value_max - value, value_min) / value_max * hue_range;
  const sat = "100%";
  const light = "70%";
  return `background: hsl(${hue}, ${sat}, ${light});`;
}
