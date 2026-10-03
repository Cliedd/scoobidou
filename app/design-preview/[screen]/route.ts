import {readFile} from 'node:fs/promises';
import path from 'node:path';

export const dynamic='force-dynamic';
const screens:Record<string,string>={
 home:'56d316eb28264b5f9a09df27281c7433',
 atlas:'72711565378143cfa27d8ca50acc967f',
 visa:'2dc43564e2904c38ace05fe4fc30f3b9',
 assistant:'cef766707c2a4f08bdf8ab010b8d98a9',
 schengen:'64045cc16fd94cb1874041d15d7374f8',
 developer:'e1aa19ed981a4ff4b90dadbf3d8ba423',
 community:'da9d82ee50304f628bda5b2956017fa9',
 dashboard:'7aad46b442d849ad8c5acab8a52c25be',
 auth:'125919af843f412d8ad87e4b4a76a2ef',
};
export async function GET(_request:Request,{params}:{params:{screen:string}}){
 const id=screens[params.screen];
 if(!id)return new Response('Unknown Stitch screen',{status:404});
 let html=await readFile(path.join(process.cwd(),'design/stitch',`${id}.html`),'utf8');
 html=html.replace(/<script src="https:\/\/cdn.tailwindcss.com[^\"]*"><\/script>/g,'').replace(/<script id="tailwind-config">[\s\S]*?<\/script>/g,`<link rel="stylesheet" href="/stitch/${id}.css">`);
 const paths:Record<string,string>={'carte-et-recherche':'atlas','fiche-exigences-et-audit':'visa','assistant-et-checklist-dossier':'assistant','calculateur-schengen-90-180j':'schengen','api-et-developpeurs':'developer','communaute-et-retours-dexperience':'community','tableau-de-bord-personnel':'dashboard','connexion-et-inscription':'auth'};
 Object.assign(paths,{'communaute':'community','tableau-de-bord':'dashboard','authentification':'auth'});
 const publicPaths:Record<string,string>={home:'/',atlas:'/',visa:'/visa',assistant:'/assistant',schengen:'/itinerary',developer:'/developer',community:'/community',dashboard:'/account',auth:'/login'};
 html=html.replace(/data-path="([^"]+)" href="#"/g,(_match,key)=>`data-path="${key}" href="${publicPaths[paths[key]||'home']}"`);
 html=html.replace('</body>', '<script src="/stitch/integration.js"></script></body>');
 html=html.replace('<main ', '<aside style="position:fixed;bottom:0;left:0;right:0;z-index:999;background:#fff8f3;border-top:1px solid #8d7169;padding:8px 20px;font:12px Inter,sans-serif">Design Stitch : chiffres, dossiers et témoignages illustratifs. Confirmez les exigences auprès des autorités. <a href="/data-policy">Politique des données</a></aside><main ');
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'"}});
}
