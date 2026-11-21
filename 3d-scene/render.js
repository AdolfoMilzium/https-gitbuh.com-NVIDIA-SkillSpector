const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:540,height:960},deviceScaleFactor:2});
 await p.goto('file://'+__dirname+'/index.html');
 const fps=30,n=process.argv[2]?+process.argv[2]:8*fps;
 require('fs').mkdirSync(__dirname+'/frames',{recursive:true});
 for(let i=0;i<n;i++){
  await p.evaluate(t=>window.render(t),i/fps);
  await p.screenshot({path:`${__dirname}/frames/f${String(i).padStart(4,'0')}.png`});
 }
 await b.close();
})();
