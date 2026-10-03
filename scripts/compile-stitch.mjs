import fs from 'node:fs/promises';
import vm from 'node:vm';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
const screens=JSON.parse(await fs.readFile('design/stitch/screens.json','utf8'));
await fs.mkdir('public/stitch',{recursive:true});
for(const screen of screens){
 const id=screen.name.split('/').at(-1);
 const html=await fs.readFile(`design/stitch/${id}.html`,'utf8');
 const source=html.match(/<script id="tailwind-config">([\s\S]*?)<\/script>/)?.[1];
 if(!source)throw Error(`Missing theme: ${id}`);
 const context={tailwind:{config:{}}};
 vm.runInNewContext(source,context,{timeout:1000});
 const css=await postcss([tailwind({...context.tailwind.config,content:[{raw:html,extension:'html'}]})]).process('@tailwind base; @tailwind components; @tailwind utilities;',{from:undefined});
 await fs.writeFile(`public/stitch/${id}.css`,css.css);
 console.log('Compiled',screen.title);
}
