type MKSROMLOADEventTarget = EventTarget & {
	result: IDBDatabase
}

export class fileStore {
	db: IDBDatabase;
	indexedDB: null;
	fileCallback: any;
	static instance: fileStore;
	waitForROM: boolean;

	constructor() {
		this.db = null;
		this.indexedDB = null;
		this.fileCallback = null;
	}

	static getInstance() {
		if (!this.instance) {
			this.instance = new fileStore();
		}
		return this.instance;
	}

	requestGameFiles(callback: (r: any) => any) {
		this.indexedDB = window.indexedDB
			|| (window as any).webkitIndexedDB
			|| (window as any).mozIndexedDB
			|| (window as any).shimIndexedDB;

		var request = indexedDB.open("MKJS-DB", 1);
		request.onerror = window.onerror;

		request.onsuccess = (event) => {
			const target = <MKSROMLOADEventTarget>event.target;
			this.db = target.result;
			this.loadGameFiles(callback);
		}

		request.onupgradeneeded = (event) => {
			const target = <MKSROMLOADEventTarget>event.target;
			this.db = target.result;
			var objectStore = this.db.createObjectStore("files", { keyPath: "filename" });
			objectStore.transaction.oncomplete = (event) => {
				this.loadGameFiles(callback);
			}
		}
	}

	loadGameFiles(callback: any) {
		var transaction = this.db.transaction(["files"]);
		transaction.oncomplete = function () {
			console.log("Success transaction");
		};
		var objectStore = transaction.objectStore("files");

		var request = objectStore.get("mkds.nds");
		request.onerror = function (event) {
			alert("Fatal database error!");
		};
		request.onsuccess = (event) => {
			if (request.result == null) this.downloadGame(null, callback);
			else callback(request.result.data);
		};
	}

	validateFiles() {
		var transaction = this.db.transaction(["files"]);
		transaction.oncomplete = function () {
			console.log("Success transaction");
		};
		var objectStore = transaction.objectStore("files");
		var request = objectStore.get("mkds.nds");
		request.onerror = () => {
			alert("Fatal database error!");
		};
		request.onsuccess = () => {
			if (request.result == null) alert("Locally storing files failed!");
		};
	}

	downloadGame(url: string, callback: any) {
		if (typeof url == "string") {
			var xml = new XMLHttpRequest();
			xml.open("GET", url, true);
			xml.responseType = "arraybuffer";
			xml.onload = () => {
				this.storeGame(xml.response, callback);
			}
			xml.send();
		} else {
			alert("You need to supply MKJS with a Mario Kart DS ROM to function. Click anywhere on the page to load a file.")
			this.fileCallback = callback;
			document.getElementById("fileIn").onchange = (...args) => this.fileInChange(...args);
			this.waitForROM = true;
		}
	}

	fileInChange(e: Event) {
		var bFile = (e.target as HTMLInputElement).files[0];
		var bReader = new FileReader();
		bReader.onload = (e) => {
			this.waitForROM = false; //todo: verify
			this.storeGame(e.target.result, (...args: any) => this.fileCallback(...args));
		};
		bReader.readAsArrayBuffer(bFile);
	}

	storeGame(dat: FileReader['result'], callback: any) {
		var transaction = this.db.transaction(["files"], "readwrite");
		transaction.oncomplete = function () {
			console.log("Success transaction");
		};
		var objectStore = transaction.objectStore("files");
		var request = objectStore.put({ filename: "mkds.nds", data: dat });

		request.onerror = () => {
			alert("Failed to store game locally!");
			callback(dat);
		};
		request.onsuccess = () => {
			this.validateFiles();
			callback(dat);
		};
	}
};