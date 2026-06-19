type MKSROMLOADEventTarget = EventTarget & {
	result: IDBDatabase;
};

type StoredGameData = FileReader["result"];
type GameFileCallback = (data: StoredGameData) => void;

export class fileStore {
	db: IDBDatabase;
	indexedDB: IDBFactory | null;
	fileCallback: GameFileCallback | null;
	static instance: fileStore;
	waitForROM!: boolean;

	constructor() {
		this.db = null!;
		this.indexedDB = null;
		this.fileCallback = null;
	}

	static getInstance() {
		if (!this.instance) {
			this.instance = new fileStore();
		}
		return this.instance;
	}

	requestGameFiles(callback: GameFileCallback) {
		this.indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.shimIndexedDB || null;

		let request = this.indexedDB!.open("MKJS-DB", 1);
		request.onerror = window.onerror;

		request.onsuccess = (event) => {
			const target = <MKSROMLOADEventTarget>event.target;
			this.db = target.result;
			this.loadGameFiles(callback);
		};

		request.onupgradeneeded = (event) => {
			const target = <MKSROMLOADEventTarget>event.target;
			this.db = target.result;
			let objectStore = this.db.createObjectStore("files", { keyPath: "filename" });
			objectStore.transaction.oncomplete = (event) => {
				this.loadGameFiles(callback);
			};
		};
	}

	private loadGameFiles(callback: GameFileCallback) {
		let transaction = this.db.transaction(["files"]);
		transaction.oncomplete = function () {
			console.log("Success transaction");
		};
		let objectStore = transaction.objectStore("files");

		let request = objectStore.get("mkds.nds");
		request.onerror = function (event) {
			alert("Fatal database error!");
		};
		request.onsuccess = (event) => {
			if (request.result == null) this.downloadGame(null, callback);
			else callback(request.result.data);
		};
	}

	private validateFiles() {
		let transaction = this.db.transaction(["files"]);
		transaction.oncomplete = function () {
			console.log("Success transaction");
		};
		let objectStore = transaction.objectStore("files");
		let request = objectStore.get("mkds.nds");
		request.onerror = () => {
			alert("Fatal database error!");
		};
		request.onsuccess = () => {
			if (request.result == null) alert("Locally storing files failed!");
		};
	}

	private downloadGame(url: string | null, callback: GameFileCallback) {
		if (typeof url == "string") {
			let xml = new XMLHttpRequest();
			xml.open("GET", url, true);
			xml.responseType = "arraybuffer";
			xml.onload = () => {
				this.storeGame(xml.response, callback);
			};
			xml.send();
		} else {
			alert("You need to supply MKJS with a Mario Kart DS ROM to function. Click anywhere on the page to load a file.");
			this.fileCallback = callback;
			document.getElementById("fileIn")!.onchange = (...args) => this.fileInChange(...args);
			this.waitForROM = true;
		}
	}

	private fileInChange(e: Event) {
		let bFile = (e.target as HTMLInputElement).files![0];
		let bReader = new FileReader();
		bReader.onload = (e) => {
			this.waitForROM = false; //todo: verify
			this.storeGame(e.target!.result, (data) => this.fileCallback?.(data));
		};
		bReader.readAsArrayBuffer(bFile);
	}

	private storeGame(dat: StoredGameData, callback: GameFileCallback) {
		let transaction = this.db.transaction(["files"], "readwrite");
		transaction.oncomplete = function () {
			console.log("Success transaction");
		};
		let objectStore = transaction.objectStore("files");
		let request = objectStore.put({ filename: "mkds.nds", data: dat });

		request.onerror = () => {
			alert("Failed to store game locally!");
			callback(dat);
		};
		request.onsuccess = () => {
			this.validateFiles();
			callback(dat);
		};
	}
}
