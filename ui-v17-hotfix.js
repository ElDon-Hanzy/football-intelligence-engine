(function(){
  // C0165 — ensure body unlocks even when legacy close listeners hold the original closeDrawer reference.
  function unlockBody(){
    if(!document.body.classList.contains('c0165-modal-open'))return;
    const top=parseInt(document.body.style.top||'0',10)||0,y=Math.max(0,-top);
    document.body.classList.remove('c0165-modal-open');document.body.style.top='';window.scrollTo(0,y);
  }
  document.getElementById('drawerClose')?.addEventListener('click',unlockBody);
  document.getElementById('drawerBackdrop')?.addEventListener('click',unlockBody);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setTimeout(unlockBody,0)});
  const drawer=document.getElementById('detailDrawer');
  if(drawer)new MutationObserver(()=>{if(drawer.getAttribute('aria-hidden')==='true')unlockBody()}).observe(drawer,{attributes:true,attributeFilter:['aria-hidden']});
})();
