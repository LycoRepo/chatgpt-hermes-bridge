// Replace only the CLI-generated table, preserving all other TOML verbatim.
export function replaceOwnedServer(text,table) {
  const lines=text.split(/(?<=\n)/);
  const start=lines.findIndex(line=>/^\[mcp_servers\.hermes_bridge\]\s*$/.test(line.trim()));
  if(start<0) throw new Error('server_table_not_found');
  let end=start+1;
  while(end<lines.length&&!/^\s*\[/.test(lines[end])) end++;
  // CLI-generated args may be multiline arrays; a closing bracket is not a table header.
  // The next table must have a TOML name after '['; array item lines don't qualify.
  end=start+1;
  while(end<lines.length&&!/^\s*\[\[?[A-Za-z_"']/.test(lines[end])) end++;
  return lines.slice(0,start).join('')+table+'\n'+lines.slice(end).join('');
}
