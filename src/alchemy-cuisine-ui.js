import { cuisineTraditions, searchIngredients } from "./ingredient-catalog.js";

let cuisine = "All traditions";
ready(init);
function ready(fn){document.readyState === "loading" ? document.addEventListener("DOMContentLoaded",fn,{once:true}) : fn();}
function init(){
  const attach=()=>{
    const view=document.querySelector("#view-alchemy");
    const search=view?.querySelector(".alchemy-search");
    const cards=view?.querySelector("#alchemy-cards");
    if(!view||!search||!cards||view.querySelector("#alchemy-cuisine"))return false;
    const label=document.createElement("label");
    label.className="alchemy-cuisine-control";
    label.innerHTML=`<span class="sr-only">Cuisine or tradition</span><select id="alchemy-cuisine">${cuisineTraditions().map(value=>`<option>${escapeHtml(value)}</option>`).join("")}</select>`;
    search.append(label);
    label.querySelector("select").addEventListener("change",event=>{cuisine=event.currentTarget.value;globalThis.MANGROK_SELECTED_CUISINE=cuisine;filterCards(cards);});
    new MutationObserver(()=>filterCards(cards)).observe(cards,{childList:true});
    globalThis.MANGROK_SELECTED_CUISINE=cuisine;
    return true;
  };
  if(!attach())new MutationObserver(()=>attach()).observe(document.body,{childList:true,subtree:true});
}
function filterCards(root){
  if(cuisine==="All traditions"){root.querySelectorAll("[data-item]").forEach(card=>card.hidden=false);return;}
  const allowed=new Set(searchIngredients({cuisine,limit:500}).items.map(item=>item.name));
  root.querySelectorAll("[data-item]").forEach(card=>{card.hidden=!allowed.has(card.dataset.item);});
}
function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);}
