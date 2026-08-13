import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverManagedRuntime,recoveryCooldown,recoveryDelay,shouldAttemptRuntimeRecovery} from '../server/lib/runtime-recovery.mjs';

test('runtime recovery policy is bounded and exponential',()=>{assert.deepEqual([1,2,3,4].map(x=>recoveryDelay(x)),[250,500,1000,2000]);assert.equal(recoveryCooldown(9),30000);assert.equal(shouldAttemptRuntimeRecovery({wasReady:true,ready:false,now:10,nextAt:9}),true);assert.equal(shouldAttemptRuntimeRecovery({wasReady:false,ready:false}),false);assert.equal(shouldAttemptRuntimeRecovery({provider:'openai',wasReady:true}),false)});
test('managed runtime recovery retries current generation without downloads',async()=>{let starts=0,stops=0;const sleeps=[];const result=await recoverManagedRuntime({sleep:async ms=>sleeps.push(ms),createRuntime:()=>({async start(){starts++},status(){return {ready:starts>=3}},stop(){stops++}})});assert.equal(result.attempts,3);assert.equal(starts,3);assert.equal(stops,2);assert.deepEqual(sleeps,[250,500])});
test('managed runtime recovery fails closed after bounded attempts',async()=>{let starts=0;await assert.rejects(()=>recoverManagedRuntime({maxAttempts:2,sleep:async()=>{},createRuntime:()=>({async start(){starts++},status:()=>({ready:false}),stop(){}})}),/not_ready/);assert.equal(starts,2)});
