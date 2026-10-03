import fs from 'node:fs/promises';
const url = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const response = await fetch(url);
if(!response.ok) throw Error(`Map download failed: ${response.status}`);
const collection = await response.json();
const features = collection.features.map(feature => ({type:'Feature',properties:{code:feature.properties.ISO_A2_EH || feature.properties.ISO_A2,name:feature.properties.NAME_FR || feature.properties.NAME},geometry:feature.geometry}));
await fs.mkdir('public/maps',{recursive:true});
await fs.writeFile('public/maps/world.json',JSON.stringify({type:'FeatureCollection',features}));
console.log(`Imported ${features.length} geographic features from Natural Earth (public domain).`);
