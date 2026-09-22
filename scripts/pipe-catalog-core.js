/* Shared pure functions: UI and integration checks use the same query/export contract. */
const PipeCatalogCore = (() => {
 function filter(catalog, options = {}) {
  const tokens=(options.query||'').trim().toLowerCase().split(/\s+/).filter(Boolean);
  return catalog.records.filter(r => {
   const search=[r.material,r.part,r.keys.nominalDiameter,r.keys.variant,r.keys.joint,r.keys.angle == null?'':r.keys.angle,r.source.table].join(' ').toLowerCase();
   return (!options.material||r.material===options.material)&&(!options.part||r.part===options.part)&&(!options.dn||String(r.keys.nominalDiameter)===String(options.dn))&&(!options.status||r.validation.status===options.status)&&tokens.every(t=>/^\d+(?:\.\d+)?$/.test(t)?[r.keys.nominalDiameter,r.keys.angle,...(r.keys.variant.match(/\d+(?:\.\d+)?/g)||[])].some(v=>v!=null&&Number(t)===Number(v)):search.includes(t));
  }).sort((a,b)=>a.material.localeCompare(b.material,'ko')||a.part.localeCompare(b.part,'ko')||a.keys.nominalDiameter-b.keys.nominalDiameter||a.keys.variant.localeCompare(b.keys.variant)||a.keys.joint.localeCompare(b.keys.joint));
 }
 function payload(catalog, rows) {
  return {schemaVersion:catalog.schemaVersion,kind:'waterbim-pipe-catalog',exportedAt:new Date().toISOString(),disclaimer:catalog.disclaimer,coverage:catalog.coverage,fields:catalog.fields,sources:catalog.sources,records:rows};
 }
 return {filter,payload};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=PipeCatalogCore;
