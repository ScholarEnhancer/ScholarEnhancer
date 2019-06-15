class paperInfo {
	constructor(data){
		
	}
	getBibtexEntry(){

	}
}

function saveTextToFile(text, fileName) {
	const blob = new Blob([text], {type: 'text/plain;charset=utf-8'});
	if (!fileName) { fileName = 'export.json'; }
	saveAs(blob, fileName);
}

function exportObjectAsJSON( object, fileName = null ) {
	const exportJSON = JSON.stringify(object, null, 2);
	saveTextToFile(exportJSON, fileName);
}

class ScholarEnhancer {
	constructor() {
		this.maxPapers = null; 
		this.detailsWaitInterval = 50; // In ms
		this.allPapers = [];
		
		// State variable
		this.scanning = false;
		this.matchCount = 0;

		// Ui components
		this.rootElem = null;
		this.showAllBtn = null;
		this.scanBtn = null;
		this.exportBtn = null;
		this.msgElem = null;
		
		this.statsElem = null;
		
		// Timers
		this.msgTimeout = null;
		this.showMoreInterval = null;
		this.detailPageWaitInterval = null;


		this.createUI();
	}

	getUIRoot() {
		return document.getElementById('ScholarEnhancerRoot');
	}

	createUI() {
		if (!this.getUIRoot()) {
			if (window.location.href.indexOf('scholar.google.com/citations') === -1) { return; }

			// Create UI
			this.rootElem = document.createElement('div');
			this.rootElem.id = 'ScholarEnhancerRoot';
			document.getElementsByTagName('body')[0].appendChild(this.rootElem);
			
			this.closeBtn = document.createElement('button');
			this.closeBtn.onclick = (ev) => { this.rootElem.classList.add('closed') };
			this.closeBtn.innerText = 'x';
			this.closeBtn.className = 'closeBtn';
			this.rootElem.appendChild(this.closeBtn);
			
			this.showAllBtn = document.createElement('button');
			this.showAllBtn.onclick = (ev) => { this.showAllBtnCallback(ev) };
			this.showAllBtn.innerText = 'Show All';
			this.rootElem.appendChild(this.showAllBtn);
			
			this.scanBtn = document.createElement('button');
			this.scanBtn.onclick = (ev) => { this.scanBtnCallback(ev) };
			this.scanBtn.innerText = 'Scan';
			this.rootElem.appendChild(this.scanBtn);
			
			this.exportBtn = document.createElement('button');
			this.exportBtn.onclick = (ev) => { this.exportBtnCallback(ev) };
			this.exportBtn.innerText = 'Export';
			this.rootElem.appendChild(this.exportBtn);
			
			this.statsElem = document.createElement('span');
			this.rootElem.appendChild(this.statsElem);

			this.msgElem = document.createElement('span');
			this.rootElem.appendChild(this.msgElem);

			this.setMessage('Scholar Enhancer is ready!', 10000);
			this.updateStats();
		}
	}

	setMessage(txt, timeout = 0, className = 'normal'){
		this.msgElem.innerText = txt;
		this.msgElem.className = className;
		if (timeout){
			if (this.msgTimeout) {
				clearTimeout(this.msgTimeout);
			}
			this.msgTimeout = setTimeout( () => {
				this.msgElem.innerText = '';
				this.msgTimeout = null;
			}, timeout);
		}
	}

	updateStats(){
		this.getPaperElems();
		let statText;
		if (this.scanning || this.allPapers.length){
			statText = this.allPapers.length + ' of ' + this.matchCount + ' extracted';
		} else {
			statText = this.matchCount + ' papers';
		}
		this.statsElem.innerText = statText;
	}

	async showAllBtnCallback( ev ){
		ev.stopPropagation(); // Important
		if (this.showMoreInterval) clearInterval(this.detailPageWaitInterval);
		this.showMoreInterval = setInterval( () => {
			const showMoreBtn = document.getElementById('gsc_bpf_more');
			if (showMoreBtn && !showMoreBtn.disabled) {
				showMoreBtn.click();
			}
		}, 500);
	}

	async scanBtnCallback( ev ){
		ev.stopPropagation(); // Important
		if (!this.scanning) {
			this.scanning = true;
			this.scanBtn.innerText = 'Stop';
			// scrapPapersO(this.maxPapers).then( (p) => { this.allPapers = p; } );
			this.scrapPapers(this.maxPapers).then( () => {
				this.scanning = false;
				this.scanBtn.innerText = 'Scan';
			});
		} else {
			this.scanning = false;
			this.scanBtn.innerText = 'Scan';
		}
	}

	async exportBtnCallback( ev ){
		ev.stopPropagation(); // Important
		const nameElem = document.getElementById('gsc_prf_in');
		let saveFileName = (nameElem)?(nameElem.innerText+'.json'):'export.json';
		exportObjectAsJSON(this.allPapers, saveFileName);
	}

	async waitForDetailsPage(forOpen){
		return new Promise((resolve, reject) => {
			if (this.detailPageWaitInterval) clearInterval(this.detailPageWaitInterval);
			this.detailPageWaitInterval = setInterval( () => {
				let isOpen = (this.getTitleElemInDetailsPage()) && document.querySelectorAll('.gs_md_wnw.gs_md_wmw.gs_vis').length > 0;
				if (isOpen === forOpen) {
					clearInterval(this.detailPageWaitInterval);
					return resolve(isOpen);
				}
			}, this.detailsWaitInterval);
		});
	}

	getTitleElemInDetailsPage(e){
		if (document.querySelector('.gsc_vcd_title_link')) {
			return document.querySelector('.gsc_vcd_title_link'); // Has link
		} else {
			return document.querySelector('#gsc_vcd_title'); // No link
		}
	}

	getTitleElemInListing(e){
		return e.children[e.children.length-3].children[0];
	}

	async scrapPaperInfo(e){
		// const year = e.children[e.children.length-1].children[0].innerText;
		// Click on link
		let titleElem = this.getTitleElemInListing(e);
		titleElem.click();
		console.log('Clicked on "' + titleElem.innerText.slice(0, 20) + '..."');
		await this.waitForDetailsPage(true); // Wait for opening
		const data = {
			"title": this.getTitleElemInDetailsPage().innerText,
			"authors": document.getElementsByClassName('gs_scl')[0].children[1].innerText,
			"date": document.getElementsByClassName('gs_scl')[1].children[1].innerText,
			"type": document.getElementsByClassName('gs_scl')[2].children[0].innerText,
			"publication": document.getElementsByClassName('gs_scl')[2].children[1].innerText,
		};
		const urlElem = document.getElementsByClassName('gsc_vcd_title_link');
		if (urlElem.length > 0) { data["url"] = urlElem[0].href; }
		Array.from(document.getElementsByClassName('gs_scl')).splice(2).forEach( rowElem => {
			const name = rowElem.children[0].innerText.toLowerCase();
			if ((name === 'volume') || (name === 'issue') || (name === 'pages') || (name === 'publisher') || (name === 'description')){
				const value = rowElem.children[1].innerText;
				if (name === 'description'){
					data['abstract'] = value;
				} else {
					data[name] = value;
				}
			} else if (name === 'total citations') {
				const value = rowElem.children[1].children[0].innerText;
				data['citations'] = value.replace('Cited by', '').trim();
			}
		});
		const closeBtn = document.getElementById('gs_md_cita-d-x');
		closeBtn.click();
		await this.waitForDetailsPage(false); // Wait for closure
		return data;
	}

	getPaperElems() {
		let elems = Array.from(document.getElementsByClassName('gsc_a_tr'));
		this.matchCount = elems.length;
		return elems;
	}

	scrapPapers(maxCnt) {
		return new Promise((resolve, reject) => {
			let elems = this.getPaperElems();
			if (maxCnt) {
				elems = elems.slice(0, maxCnt);
			}
			this.clearPapers();
			let result = Promise.resolve();
			elems.forEach( (e, i) => {
				result = result.then(async () => {
					let a = await this.scrapPaperInfo(e);
					// let a = await scrapPaperInfoO(e);
					this.addPaper( a );
					if ((i === (elems.length-1)) || !this.scanning) {
						return resolve();
					}
				});
			});
		});
	}

	addPaper( paperInfo ){
		this.allPapers.push(paperInfo);
		let msgText = 'Fetched ' + paperInfo['authors'].split(',').splice(0, 1) + ', ... ' + paperInfo['date'];
		this.setMessage(msgText, 1000);
		this.updateStats();
	}

	clearPapers( ) {
		this.allPapers = [];
		this.updateStats();
	}

	getCoauthors(){
		let allAuthors = '';
		this.allPapers.forEach( a => allAuthors += a["authors"] + '\n' )
		let names = allAuthors.split(/\n|\,/).map(s => s.trim(s)).filter(s => s.length);
		let list = '';
		for (let i = 0; i<names.length; i++) {
			const w = names[i].split(' ');
			let o = w;
			if (w.length >= 2) {
				let wn = w.slice(-1).concat(w.slice(0, -1));
				wn = wn.map( (s, i) => ( (i<=1)?(s):(s[0]) ) );
				o = wn.join(', ');
			}
			list += o + '\n';
		}
	}
}

if (window.SS === undefined){
	window.SS = new ScholarEnhancer();
}
