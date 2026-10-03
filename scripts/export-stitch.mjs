import fs from 'node:fs/promises';
const config = await fs.readFile('/home/ryzen/.codex/config.toml', 'utf8');
const key = config.match(/"X-Goog-Api-Key"\s*=\s*"([^"]+)"/)?.[1];
if (!key) throw new Error('Stitch credential missing');
const response = await fetch('https://stitch.googleapis.com/mcp', {method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','X-Goog-Api-Key':key},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'list_screens',arguments:{projectId:'6790402518525961925'}}})});
const result=await response.json();
const screens=result.result.structuredContent?.screens || JSON.parse(result.result.content[0].text).screens;
await fs.mkdir('design/stitch',{recursive:true});
for(const screen of screens){
 const id=screen.name.split('/').at(-1);
 const html=await fetch(screen.htmlCode.downloadUrl);
 if(!html.ok)throw Error(`Export failed ${id}: ${html.status}`);
 await fs.writeFile(`design/stitch/${id}.html`,await html.text());
 if(screen.screenshot?.downloadUrl){const image=await fetch(screen.screenshot.downloadUrl);if(image.ok)await fs.writeFile(`design/stitch/${id}.png`,Buffer.from(await image.arrayBuffer()));}
 console.log(id,screen.title);
}
await fs.writeFile('design/stitch/screens.json',JSON.stringify(screens.map(({name,title,width,height})=>({name,title,width,height})),null,2));
