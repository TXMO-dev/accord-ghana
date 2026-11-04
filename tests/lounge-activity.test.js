import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoungeActivityTracker} from '../src/lounge-activity.js';
const row=(id,wallet='A',extra={})=>({id,wallet,created_at:'2026-11-04T12:00:00Z',expires_at:'2026-11-05T12:00:00Z',...extra});
const options={now:Date.parse('2026-11-04T13:00:00Z')};
test('history is silent; new text and voice posts appear once, even after reconnect or restore',()=>{const t=createLoungeActivityTracker();assert.deepEqual(t.observe([row('old')],options),[]);const voice=row('voice','B',{voice_seconds:4});assert.deepEqual(t.observe([voice,row('old')],options),[voice]);assert.deepEqual(t.observe([],options),[]);assert.deepEqual(t.observe([voice],options),[]);});
test('expired and muted messages never trigger activity, including after unmuting',()=>{const t=createLoungeActivityTracker();t.observe([],options);const muted=row('muted','B'),expired=row('expired','A',{expires_at:'2026-11-03T12:00:00Z'});assert.deepEqual(t.observe([muted,expired],{...options,muted:new Set(['B'])}),[]);assert.deepEqual(t.observe([muted],options),[]);});
