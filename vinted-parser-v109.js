(()=>{
  'use strict';
  function linesFrom(texts){
    return (Array.isArray(texts)?texts:[texts]).flatMap(t=>String(t||'').replace(/\r/g,'').split('\n'))
      .map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
  }
  function fromUrl(url){
    try {
      const u=new URL(url);
      if(!/(^|\.)vinted\./i.test(u.hostname)) return {id:'',title:'',brand:'',size:''};
      const m=u.pathname.match(/\/items\/(\d+)-?([^/?#]*)/i);
      if(!m) return {id:'',title:'',brand:'',size:''};
      const slug=decodeURIComponent(m[2]||'').replace(/[-_+]+/g,' ').replace(/\s+/g,' ').trim();
      const brand=/^ca(?:\s|$)/i.test(slug)?'C&A':'';
      let title=slug.replace(/^ca(?=\s|$)/i,'C&A').replace(/\bgrosse\b/gi,'Größe');
      title=title.replace(/\b(schlafanzug|sommer|giraffe|pullover|jacke|hose|body|kleid|tshirt|t-shirt)\b/gi,s=>s[0].toUpperCase()+s.slice(1));
      const size=(title.match(/\bGröße\s*(\d{2,3})(?!\d)/i)||[])[1]||'';
      return {id:m[1],title,brand,size};
    }catch{return {id:'',title:'',brand:'',size:''};}
  }
  function labelValue(lines,label){
    for(let i=0;i<lines.length;i++){
      const re=new RegExp('^'+label+'\\s*[:：–-]?\\s*(.*)$','i');
      const m=lines[i].match(re);
      if(!m)continue;
      let v=(m[1]||'').trim();
      if(!v && lines[i+1])v=lines[i+1].trim();
      if(!v||/^(Marke|Größe|Zustand|Farbe|Hochgeladen|Versand|Beschreibung)$/i.test(v))continue;
      return v;
    }
    return '';
  }
  function cleanSize(value){
    const s=String(value||'').replace(/[–—]/g,'-');
    const slash=s.match(/(?:Monate?|Months?|Jahre?)\s*\/\s*(\d{2,3})\b/i)||s.match(/\/\s*(\d{2,3})(?!\d)/);
    if(slash)return slash[1];
    const explicit=s.match(/\b(?:Größe|Gr\.?)\s*:?\s*(\d{2,3})\b/i);
    if(explicit)return explicit[1];
    if(/^\d{2,3}$/.test(s.trim()))return s.trim();
    if(/^\d{2,3}\s*[-]\s*\d{2,3}\s+Monat/i.test(s))return '';
    return '';
  }
  function moneyToNumber(raw){
    let t=String(raw||'').replace(/\s/g,'');
    if(t.includes(',')&&t.includes('.'))t=t.replace(/\./g,'').replace(',','.');
    else if(t.includes(','))t=t.replace(',','.');
    const n=Number(t);
    return Number.isFinite(n)&&n>=0&&n<=100000?n:null;
  }
  function sellerPrice(lines){
    const amounts=[];
    for(let i=0;i<lines.length;i++){
      const line=lines[i];
      if(/(?:Versand|ab\s*\d|Gebühr|Gesamt|inkl\.?|zzgl\.?|Käuferschutz)/i.test(line))continue;
      const pattern=/(\d{1,5}(?:[.,]\d{1,2})?)\s*€/g;
      let match;
      while((match=pattern.exec(line))!==null){
        const price=moneyToNumber(match[1]);
        if(price!==null && price>0) amounts.push(price);
      }
    }
    return amounts.length?Math.min(...amounts):null;
  }
  function titleFromScreenshots(lines){
    // Require content that resembles the product title, not the browser's navigation/search UI.
    const candidates=[];
    for(let i=0;i<lines.length;i++){
      const line=lines[i];
      if(/Katalog|Suche Artikel|Vinted|Versand|Gebühr|Frage stellen|Hochgeladen|Marke|Zustand|Farbe|Kaufen|Verhandeln/i.test(line))continue;
      if(line.length<16||line.length>125||/€/.test(line))continue;
      if(/^(?:Kinder|Jungs|Mädchen|Babykleidung|Kategorien)\s*(?:\/|$)/i.test(line))continue;
      const pipes=(line.match(/\|/g)||[]).length;
      const clothing=/(?:Schlafanzug|Pullover|\bHose\b|Jacke|\bBody\b|Shirt|\bKleid\b|Schuhe|Jeans|Mütze|Strampler|Strick)/i.test(line);
      if(!clothing)continue;
      let candidate=line;
      if(/[|,]\s*$/.test(candidate)&&lines[i+1]&&/^[\p{L}\s-]{3,35}$/u.test(lines[i+1]))candidate+=' '+lines[i+1];
      candidates.push({title:candidate.replace(/\s*\|\s*/g,' | ').replace(/\s+/g,' ').trim(),score:pipes*3+(clothing?5:0)+(/(?:Größe|Gr\.?)\s*\d{2,3}/i.test(line)?3:0)-(i*.1)});
    }
    candidates.sort((a,b)=>b.score-a.score);
    return candidates[0]?.title||'';
  }
  function conditionValue(raw){
    const s=String(raw||'').toLowerCase();
    if(/\bsehr gut\b/.test(s))return 'Sehr gut';
    if(/\bneu\b/.test(s))return 'Neu';
    if(/\bgut\b/.test(s))return 'Gut';
    if(/\b(?:zufriedenstellend|akzeptabel)\b/.test(s))return 'Zufriedenstellend';
    return '';
  }
  function categoryFromTitle(title){
    if(/schlafanzug|pyjama/i.test(title))return 'Schlafanzug';
    if(/pullover|sweatshirt|strickpull/i.test(title))return 'Pullover';
    if(/t[\s-]?shirt/i.test(title))return 'T-Shirt';
    if(/body|bodys|bodies/i.test(title))return 'Body';
    if(/jacke/i.test(title))return 'Jacke';
    if(/hose|jeans/i.test(title))return 'Hose';
    if(/kleid/i.test(title))return 'Kleid';
    if(/schuh|sneaker/i.test(title))return 'Schuhe';
    if(/mütze/i.test(title))return 'Mütze';
    return '';
  }
  function parse(texts,url){
    const lines=linesFrom(texts);
    const link=fromUrl(url);
    const screenTitle=titleFromScreenshots(lines);
    const title=screenTitle||link.title||'';
    const rawSize=labelValue(lines,'Größe');
    const size=cleanSize(rawSize)||cleanSize(title)||link.size||'';
    const brandRaw=labelValue(lines,'Marke');
    const cleanBrand=String(brandRaw||'').replace(/[\s:：;；>›»→➜➔❯〉▸▷▶|〉》]+$/u,'').trim();
    const brand=(cleanBrand&&cleanBrand.length<40?cleanBrand:'')||link.brand;
    const condition=conditionValue(labelValue(lines,'Zustand'));
    const rawColor=labelValue(lines,'Farbe');
    const color=/^(?:beige|blau|rot|rosa|pink|grün|gelb|schwarz|weiß|weiss|grau|braun|lila|violett|orange|bunt|creme|navy|türkis)$/i.test(rawColor)?rawColor[0].toUpperCase()+rawColor.slice(1):'';
    const uploaded=labelValue(lines,'Hochgeladen');
    const relativeUpload=/\b(?:\d+\s*(?:Tag(?:e|en)?|Woche(?:n)?|Monat(?:e|en)?|Jahr(?:e|en)?)|gestern|heute)\b/i.test(uploaded)?uploaded:'';
    return {
      title,price:sellerPrice(lines),brand,size,condition,color,category:categoryFromTitle(title),
      uploadedRelative:relativeUpload,onlineSince:'',listingId:link.id,
      warnings:[...(relativeUpload?['Einstelldatum nur ungefähr ('+relativeUpload+'). Bei Bedarf ergänzen.']:[])]
    };
  }
  window.JennySellsVintedParser={parse,fromUrl};
})();