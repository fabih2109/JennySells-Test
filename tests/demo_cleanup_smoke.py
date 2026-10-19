"""Run: python3 tests/demo_cleanup_smoke.py (requires Playwright and Chromium).

All fixtures live in isolated browser profiles, outside the application's data.
"""
import functools
import json
import re
import shutil
import tempfile
import threading
import zipfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
VERSION = re.search(r"JennySellsVersion='([^']+)'", (ROOT / 'index.html').read_text()).group(1)
SNAPSHOT = '''async()=>{
 const db=await new Promise(r=>{const q=indexedDB.open('JennySellsDB',2);q.onsuccess=()=>r(q.result)});
 const values=await Promise.all(['articles','images','categories','settings'].map(s=>new Promise(r=>{const q=db.transaction(s).objectStore(s).getAll();q.onsuccess=()=>r(q.result)})));
 for(const image of values[1])image.blob={type:image.blob.type,bytes:[...new Uint8Array(await image.blob.arrayBuffer())]};
 db.close();return {articles:values[0],images:values[1],categories:values[2].map(v=>v.name).sort(),settings:values[3]};
}'''
SEED = '''async()=>{
 const date=new Date().toISOString(),base={category:'Hose',source:'Privat',status:'online',price:5,emoji:'👕',createdAt:date};
 const articles=Array.from({length:20},(_,i)=>({...base,id:'demo'+i,title:'Alter Beispielartikel '+i}));
 for(const id of ['own-one','own-two','own-sale','demo20','demo-custom'])articles.push({...base,id,title:'Eigener Artikel '+id,note:'Eigene Notiz',url:'https://example.com/'+id});
 for(const id of ['demo0','own-one','demo20'])articles.find(v=>v.id===id).coverImageKey='cover:'+id;
 const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#71389b';ctx.fillRect(0,0,2,2);
 const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
 const db=await new Promise(r=>{const q=indexedDB.open('JennySellsDB',2);q.onupgradeneeded=()=>{
  q.result.createObjectStore('articles',{keyPath:'id'});q.result.createObjectStore('images',{keyPath:'key'});
  q.result.createObjectStore('categories',{keyPath:'name'});q.result.createObjectStore('settings',{keyPath:'key'});q.result.createObjectStore('meta',{keyPath:'key'});
 };q.onsuccess=()=>r(q.result)});
 await new Promise((resolve,reject)=>{const tx=db.transaction(['articles','images','categories','settings','meta'],'readwrite');
  articles.forEach(v=>tx.objectStore('articles').put(v));
  for(const id of ['demo0','own-one','demo20'])tx.objectStore('images').put({key:'cover:'+id,blob,createdAt:date});
  for(const name of ['Hose','Spielzeug','Eigene Kategorie'])tx.objectStore('categories').put({name});
  tx.objectStore('settings').put({key:'theme',value:'blue'});tx.objectStore('meta').put({key:'initialized',value:true});
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
 });db.close();localStorage.setItem('jennysellsItemsV4',JSON.stringify(articles));
}'''
FAULTS = '''(()=>{
 const fault=localStorage.getItem('cleanup-test-fault');if(!fault)return;
 const put=IDBObjectStore.prototype.put,del=IDBObjectStore.prototype.delete;
 IDBObjectStore.prototype.put=function(value,...rest){
  if(fault==='backup'&&this.name==='meta'&&value?.key==='demoCleanupV0131')throw new DOMException('Simulated quota failure','QuotaExceededError');
  return put.call(this,value,...rest);
 };
 IDBObjectStore.prototype.delete=function(key){
  if(fault==='delete'&&this.name==='articles'&&key==='demo1')throw new Error('Simulated deletion failure');
  return del.call(this,key);
 };
})();'''

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

def ready(page):
    page.wait_for_function('window.JennySellsData?.getStatus().ready')

def more(page, section):
    page.locator('.bottom [data-go="settings"]').click()
    if page.locator('#jsMoreBack').is_visible():
        page.locator('#jsMoreBack').click()
    page.locator(f'[data-more-section="{section}"]').click()

def save_offered_file(page, path):
    with page.expect_download() as info:
        page.locator('#jsDataSaveFile').click()
    info.value.save_as(path)

def restore(page, path):
    more(page, 'backup')
    page.locator('#jsBackupInput').set_input_files(path)
    page.locator('#jsDataDialog').wait_for()
    with page.expect_navigation(wait_until='load'):
        page.locator('#jsDataDialogActions').get_by_role('button', name='Ja, ersetzen').click()
    ready(page)

with tempfile.TemporaryDirectory() as temp, sync_playwright() as p:
    temporary = Path(temp)
    (temporary / 'JennySells-Test').symlink_to(ROOT, target_is_directory=True)
    (temporary / 'seed.html').write_text('<!doctype html><title>Test fixture</title>')
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=temp))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_address[1]}'
    launch = {'args': ['--no-sandbox']}
    if shutil.which('chromium'):
        launch['executable_path'] = shutil.which('chromium')
    browser = p.chromium.launch(**launch)
    for fault in [None, 'backup', 'delete']:
        context = browser.new_context(viewport={'width': 393, 'height': 780}, is_mobile=True, service_workers='block', accept_downloads=True)
        context.add_init_script(FAULTS)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('dialog', lambda dialog: dialog.accept())
        page.goto(origin + '/seed.html')
        page.evaluate(SEED)
        before = page.evaluate(SNAPSHOT)
        expected = {**before, 'articles': [a for a in before['articles'] if not re.fullmatch(r'demo(?:[0-9]|1[0-9])', a['id'])]}
        if fault:
            page.evaluate('fault=>localStorage.setItem("cleanup-test-fault",fault)', fault)
        page.goto(origin + '/JennySells-Test/')
        ready(page)
        if fault:
            assert page.evaluate(SNAPSHOT) == before, 'Failed cleanup changed articles/images'
            assert 'Demo-Bereinigung abgebrochen' in page.locator('#jsDataStatus').text_content()
            assert not page.evaluate('''async()=>{const db=await new Promise(r=>{const q=indexedDB.open('JennySellsDB',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('meta').objectStore('meta').get('demoCleanupV0131');q.onsuccess=()=>{db.close();r(!!q.result)}})}''')
            page.evaluate('localStorage.removeItem("cleanup-test-fault")')
            page.reload()
            ready(page)
        assert page.evaluate(SNAPSHOT) == expected, 'Own records, image bytes, categories or theme changed'
        assert page.evaluate('items.length') == 5
        more(page, 'about')
        page.wait_for_timeout(2700)
        assert page.locator('.jsAboutVersion').text_content() == 'Version V' + VERSION
        more(page, 'backup')
        page.locator('#jsDemoCleanupBackup').click()
        archived = temporary / 'before-cleanup.zip'
        save_offered_file(page, archived)
        with zipfile.ZipFile(archived) as archive:
            backup = json.loads(archive.read('backup.json'))
            assert backup['appVersion'] == VERSION
            assert backup['articles'] == before['articles']
            assert sorted(backup['categories']) == before['categories']
            assert backup['settings']['theme'] == 'blue'
            for image in backup['images']:
                original = next(v for v in before['images'] if v['key'] == image['key'])
                assert archive.read(image['ref']) == bytes(original['blob']['bytes'])
        page.evaluate('window.JennySellsData.exportZip()')
        cleaned = temporary / 'after-cleanup.zip'
        save_offered_file(page, cleaned)
        with zipfile.ZipFile(cleaned) as archive:
            assert len(json.loads(archive.read('backup.json'))['articles']) == 5
        page.reload()
        ready(page)
        assert page.evaluate(SNAPSHOT) == expected, 'Reload resurrected removed demo articles'
        more(page, 'backup')
        page.locator('#jsDemoCleanupBackup').click()
        repeated = temporary / 'same-archive.zip'
        save_offered_file(page, repeated)
        assert repeated.read_bytes() == archived.read_bytes(), 'Original archive was replaced on reload'
        restore(page, archived)
        assert page.evaluate(SNAPSHOT) == before, 'Recovery ZIP did not fully restore the original data'
        page.reload()
        ready(page)
        assert page.evaluate(SNAPSHOT) == before, 'Explicit restore was deleted again'
        restore(page, cleaned)
        assert page.evaluate(SNAPSHOT) == expected
        assert page.locator('#jsDemoCleanupBackup').count() == 1
        assert not errors, errors
        context.close()
        print('PASS:', fault or 'normal', ': 25 -> 5, original photos/data preserved, ZIP recovery, idempotence and rollback/retry', flush=True)
    empty = browser.new_context(service_workers='block')
    page = empty.new_page()
    page.goto(origin + '/JennySells-Test/')
    ready(page)
    assert page.evaluate('items.length') == 0
    assert page.locator('#jsDemoCleanupBackup').count() == 0
    empty.close()
    browser.close()
    server.shutdown()
print('PASS: new installation stays empty.')
