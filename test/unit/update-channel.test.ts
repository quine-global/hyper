import test from 'ava';

import {followsCanary, isCanaryBuild} from '../../app/utils/update-channel';

test('canary builds are recognized by their version', (t) => {
  t.true(isCanaryBuild('4.0.0-q-canary.23'));
  t.true(isCanaryBuild('4.0.0-canary.1'));
  t.false(isCanaryBuild('4.0.0-q'));
  t.false(isCanaryBuild('4.0.0'));
});

test('a canary build follows canary even when the config says stable', (t) => {
  t.true(followsCanary('stable', '4.0.0-q-canary.20'));
  t.true(followsCanary(undefined, '4.0.0-q-canary.20'));
  t.true(followsCanary('canary', '4.0.0-q-canary.20'));
});

test('a stable build follows updateChannel', (t) => {
  t.false(followsCanary('stable', '4.0.0-q'));
  t.false(followsCanary(undefined, '4.0.0-q'));
  t.true(followsCanary('canary', '4.0.0-q'));
});
