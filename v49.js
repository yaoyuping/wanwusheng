/* 万物生 4.9: purely presentational improvements and upload feedback; no storage migration. */
'use strict';
(function(){
  // The AI photo file input retains the existing upload handler. Show a clear local filename.
  const previousAI = v2aiModal;
  v2aiModal = function(pid='',mode='care'){
    previousAI(pid,mode);
    const studio=document.querySelector('#modal-root .v48-ai-studio');
    if(!studio)return;
    const input=studio.querySelector('input[type=file]');
    if(input&&!studio.querySelector('.v49-upload-caption')){
      input.classList.add('v49-hidden-native-file');
      const picker=document.createElement('div');picker.className='v49-file-picker';
      picker.innerHTML='<button type="button" class="v49-file-button">＋ 选择照片</button><span class="v49-file-name">未选择照片</span>';
      input.insertAdjacentElement('afterend',picker);
      picker.querySelector('button').addEventListener('click',()=>input.click());
      const caption=document.createElement('p');caption.className='v49-upload-caption';
      caption.textContent='照片仅在主动开始分析后发送';
      picker.insertAdjacentElement('afterend',caption);
      input.addEventListener('change',()=>{
        const filename=input.files?.[0]?.name;
        picker.querySelector('.v49-file-name').textContent=filename||'未选择照片';
      });
    }
    // Native button disabled/loading state is controlled by the existing AI implementation.
  };
  const oldBrand=v48Brand;
  v48Brand=function(){oldBrand();const kicker=document.querySelector('.topbar .eyebrow');if(kicker)kicker.textContent='LIVING ATLAS · 万物生';};
  const oldHome=homeView;
  homeView=function(){
    const markup=oldHome();
    const temp=document.createElement('div');temp.innerHTML=markup;
    // Keep the helpful current weather and stats; remove purely decorative duplicate encouragement.
    temp.querySelectorAll('.v46-page-intro,.v46-today-note').forEach(node=>node.remove());
    // A new personal journal should have a single invitation, not three identical empty panels.
    if(state && !state.plants.length){
      temp.querySelectorAll('.wide-section').forEach(node=>node.remove());
    }
    if(state && !state.sightings.length){
      const headings=[...temp.querySelectorAll('.intro-row')];
      const intro=headings.find(n=>n.textContent.includes('最近的自然相遇'));
      if(intro){const next=intro.nextElementSibling;if(next?.classList?.contains('empty'))next.remove();intro.remove();}
    }
    return temp.innerHTML;
  };
  const oldRender=render;
  render=function(){oldRender();
    // Navigation plus a contextual add button is enough. Avoid a floating CTA over the mobile content.
    const fab=document.getElementById('v46-fab');
    if(fab && ['home','plants'].includes(ui.tab))fab.classList.remove('show');
  };
  // The initial IndexedDB read is async. Apply the final design as soon as data is ready.
  let initialTries=0;
  const finalizeInitialView=()=>{
    if(typeof state!=="undefined" && state){render();return;}
    if(initialTries++<60)setTimeout(finalizeInitialView,50);
  };
  setTimeout(finalizeInitialView,0);
  const oldPlants=plantsView;
  plantsView=function(){
    const temp=document.createElement('div');temp.innerHTML=oldPlants();
    const heading=temp.querySelector('.v48-plants .page-heading p');
    if(heading)heading.textContent=`${state.plants.length} 株植物`;
    // Avoid redundant double add buttons within the same visible viewport.
    if(temp.querySelector('.v46-fab.show') && temp.querySelector('.page-heading [data-action="new-plant"]')){
      temp.querySelector('.v46-fab.show')?.classList.remove('show');
    }
    return temp.innerHTML;
  };
})();
