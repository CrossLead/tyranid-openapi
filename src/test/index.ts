import test from 'ava';
import { Tyr } from 'tyranid';
import { join } from 'path';

import {
  path,
  schema,
  generate
} from '../';

import {
  pascalCase
} from '../utils';

/**
 * boot tyranid without db
 */
test.before(async (t) => {
  await Tyr.config({
    validate: [
      { glob: join(__dirname, './models/*.js') }
    ]
  });
  t.truthy(Tyr.collections.length);
});


test('pascalCase should return correct values', (t) => {
  t.is(pascalCase('my short sentence'), 'MyShortSentence');
  t.is(pascalCase('my_snake_sentence'), 'MySnakeSentence');
});


test('should generate correct definition from schema', async (t) => {
  const s = schema(Tyr.byName['user'].def);
  t.deepEqual(s.name, 'User');
});