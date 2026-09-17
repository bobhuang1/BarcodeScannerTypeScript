/**
 * A small INI parser / serializer.
 * Port of the npm `ini` library (Isaac Z. Schlueter and Contributors,
 * https://github.com/npm/ini). Only the parts used by the multi-conf files are
 * kept.
 */

const EOL = '\n';

export interface IniObject {
  [section: string]: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

function isQuoted(val: string): boolean {
  return (val.charAt(0) === '"' && val.slice(-1) === '"') ||
    (val.charAt(0) === "'" && val.slice(-1) === "'");
}

function safe(val: unknown): string {
  const value = String(val);
  if (typeof val !== 'string' ||
    value.match(/[=\r\n]/) ||
    value.match(/^\[/) ||
    (value.length > 1 && isQuoted(value)) ||
    value !== value.trim()) {
    return JSON.stringify(val);
  }
  return value.replace(/;/g, '\\;').replace(/#/g, '\\#');
}

function dotSplitIni(str: string): string[] {
  return str
    .replace(/\1/g, '\u0002LITERAL\\1LITERAL\u0002')
    .replace(/\\\./g, '\u0001')
    .split(/\./).map((part) =>
      part.replace(/\1/g, '\\.').replace(/\2LITERAL\\1LITERAL\2/g, '\u0001')
    );
}

function unsafe(val: string): unknown {
  let value = (val || '').trim();
  if (isQuoted(value)) {
    if (value.charAt(0) === "'") {
      value = value.substr(1, value.length - 2);
    }
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  // Walk the value to find the first non-escaped ; or # character.
  let esc = false;
  let unesc = '';
  for (let i = 0, l = value.length; i < l; i++) {
    const c = value.charAt(i);
    if (esc) {
      if ('\\;#'.indexOf(c) !== -1) {
        unesc += c;
      } else {
        unesc += '\\' + c;
      }
      esc = false;
    } else if (';#'.indexOf(c) !== -1) {
      break;
    } else if (c === '\\') {
      esc = true;
    } else {
      unesc += c;
    }
  }
  if (esc) {
    unesc += '\\';
  }
  return unesc;
}

export function decodeIni(str: string): IniObject {
  const out: IniObject = {};
  let p = out as unknown as Record<string, unknown>;
  //                  section     |key      = value
  const re = /^\[([^\]]*)\]$|^([^=]+)(=(.*))?$/i;
  const lines = str.split(/[\r\n]+/g);

  lines.forEach((line) => {
    if (!line || line.match(/^\s*[;#]/)) {
      return;
    }
    const match = line.match(re);
    if (!match) {
      return;
    }
    if (match[1] !== undefined) {
      const section = unsafe(match[1]);
      p = out[section] = out.hasOwnProperty(section) ? out[section] as Record<string, unknown> : {};
      return;
    }
    const key = unsafe(match[2]);
    let value: unknown = match[3] ? unsafe(match[4] || '') : true;

    switch (value) {
      case 'true':
      case 'false':
      case 'null':
        value = JSON.parse(String(value));
        break;
      default:
        break;
    }

    // Keys with a '[]' suffix accumulate into an array.
    if (key.length > 2 && String(key).slice(-2) === '[]') {
      const arrayKey = String(key).substring(0, String(key).length - 2);
      if (!p[arrayKey]) {
        p[arrayKey] = [];
      } else if (!Array.isArray(p[arrayKey])) {
        p[arrayKey] = [p[arrayKey]];
      }
      (p[arrayKey] as unknown[]).push(value);
      return;
    }

    // Guard against replacing a previously defined array by accident.
    if (Array.isArray(p[key])) {
      (p[key] as unknown[]).push(value);
    } else {
      p[key] = value;
    }
  });

  // {a:{y:1},"a.b":{x:2}} --> {a:{y:1,b:{x:2}}}
  const toDelete: string[] = [];
  Object.keys(out).forEach((k) => {
    const sectionEntry = out[k];
    if (!sectionEntry ||
      typeof sectionEntry !== 'object' ||
      Array.isArray(sectionEntry)) {
      return;
    }
    // See if the parent section is also an object: move it there and mark this
    // one for deletion.
    const parts = dotSplitIni(k);
    let parent = out as unknown as Record<string, unknown>;
    const last = parts.pop() as string;
    const nl = last.replace(/\\\./g, '.');
    parts.forEach((part) => {
      if (!parent[part] || typeof parent[part] !== 'object') {
        parent[part] = {};
      }
      parent = parent[part] as Record<string, unknown>;
    });
    if (parent === out && nl === last) {
      return;
    }
    parent[nl] = out[k];
    toDelete.push(k);
  });
  toDelete.forEach((del) => {
    delete out[del];
  });

  return out;
}

export function encodeIni(obj: IniObject, section?: string, whitespace = false): string {
  const children: string[] = [];
  let out = '';
  const separator = whitespace ? ' = ' : '=';

  Object.keys(obj).forEach((k) => {
    const val = obj[k];
    if (val && Array.isArray(val)) {
      val.forEach((item) => {
        out += safe(k + '[]') + separator + safe(item) + '\n';
      });
    } else if (val && typeof val === 'object') {
      children.push(k);
    } else {
      out += safe(k) + separator + safe(val) + EOL;
    }
  });

  if (section && out.length) {
    out = '[' + safe(section) + ']' + EOL + out;
  }

  children.forEach((k) => {
    const nk = dotSplitIni(k).join('\\.');
    const childSection = (section ? section + '.' : '') + nk;
    const child = encodeIni(obj[k] as IniObject, childSection, whitespace);
    if (out.length && child.length) {
      out += EOL;
    }
    out += child;
  });

  return out;
}