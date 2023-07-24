//
// itemController.js
//--------------------
// An item controller for scenes. Allows items to be synced to multiple clients.
// by RHY3756547
//
// includes: gl-matrix.js (glMatrix 2.0)
//

import { Item } from "../entities/item";
import { nitroRender } from "../render/nitroRender";
import { items_IngameRes } from "./ingameRes";
import { Kart } from "../entities/kart";
import { courseScene } from "./scenes/courseScene";

export class ItemController {
	scene: courseScene;
	items: Item[];
	curInd: number;
	cliID: number;
	time: number;
	constructor(scene: courseScene) {
		this.scene = scene;
		this.items = [];
		this.curInd = 0; //next item index. Max value is insanely high so there shouldn't be much of a problem.
		this.cliID = 0; //client id, used along with item index to specify your items.
		this.time = 0;
	}

	update(scene: courseScene) {
		var itC = this.items.slice(0);
		for (var i = 0; i < itC.length; i++) {
			var ent = itC[i];
			ent.update(scene);
		}
	}

	draw(mvMatrix: mat4, pMatrix: mat4) {
		nitroRender.setShadBias(0.001);
		for (var i = 0; i < this.items.length; i++) {
			var e = this.items[i];
			e.draw(mvMatrix, pMatrix);
		}
		nitroRender.resetShadOff();
	}

	createItem(type:  keyof items_IngameRes, kart: Kart) {
		// KartItems._createItem
		var item = new Item(this.scene, kart, type, this.curInd++);
		this.items.push(item);
		return item;
	}

	removeItem(item: Item) {
		var ind = this.items.indexOf(item);
		if (ind !== -1) {
			this.items.splice(ind, 1);
		}
	}
}