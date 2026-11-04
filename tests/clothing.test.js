import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanAvatar,avatarOptions} from '../src/avatar-model.js';
import {createAvatar} from '../src/avatar-character.js';
import {clothingTexture} from '../src/clothing-texture.js';
test('all sixteen palettes and clothing cuts survive appearance validation',()=>{assert.equal(avatarOptions.region.length,16);for(const region of avatarOptions.region)for(const outfit of avatarOptions.outfit){const a=cleanAvatar({outfit,region});assert.equal(a.outfit,outfit);assert.equal(a.region,region);const texture=clothingTexture(outfit,region);if(texture){assert.equal(texture.image.data.length,128*128*4);texture.dispose();}}});
test('unknown appearance values fall back and extra metadata is discarded',()=>{const a=cleanAvatar({outfit:'script',region:'unknown',wallet:'not permitted'});assert.equal(a.outfit,'woven-wrap');assert.equal(a.region,'Ashanti');assert.equal(a.wallet,undefined);});
test('outfits retain walking and thank-you gestures',()=>{for(const outfit of avatarOptions.outfit){const avatar=createAvatar({outfit});avatar.update(0);avatar.react('thanks');avatar.update(1000);avatar.walk(1200,true);assert.ok(Number.isFinite(avatar.group.position.y));assert.ok(avatar.group.getObjectByName('upper-body'));avatar.dispose();}});
