// ========================================================
// Arcade UI helpers: menu preview panels + ▲▼ navigation
// ========================================================
function axInitMenus(){
 document.querySelectorAll('.ax-menu').forEach(menu=>{
  const items=[...menu.querySelectorAll('.ax-menu-item')];
  const set=id=>menu.querySelectorAll('.ax-preview').forEach(p=>p.classList.toggle('on',p.dataset.for===id));
  items.forEach((b,i)=>{
   b.addEventListener('pointerenter',()=>set(b.id));
   b.addEventListener('focus',()=>set(b.id));
   b.addEventListener('keydown',e=>{
    if(e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;
    e.preventDefault();
    const visible=items.filter(x=>!x.hidden&&x.offsetParent!==null);
    const k=visible.indexOf(b),next=visible[(k+(e.key==='ArrowDown'?1:-1)+visible.length)%visible.length];
    next?.focus();
   });
  });
  menu.addEventListener('pointerleave',()=>{if(!menu.contains(document.activeElement))set(items[0]?.id);});
  set(items[0]?.id);
 });
}
axInitMenus();
