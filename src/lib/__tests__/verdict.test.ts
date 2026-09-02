import { verdictLine } from '../verdict';

/** Every sentence the page can say, and when it says it. */
describe('the verdict in the app’s voice', () => {
  it('says nothing with nothing to go on', () => {
    expect(verdictLine({ liked: null, finished: null, hours: 10 })).toBeNull();
  });

  it('tells loved-and-finished from loved-and-put-down', () => {
    expect(verdictLine({ liked: 94, finished: 60, hours: 20 })).toMatch(
      /Loved, and finished/
    );
    expect(verdictLine({ liked: 90, finished: 12, hours: 80 })).toMatch(
      /long one that people put down/
    );
    expect(verdictLine({ liked: 90, finished: 12, hours: 8 })).toMatch(
      /Worth knowing before you start/
    );
  });

  it('grades the rest by how many recommend it', () => {
    expect(verdictLine({ liked: 75, finished: null, hours: 10 })).toMatch(
      /Well liked/
    );
    expect(verdictLine({ liked: 55, finished: null, hours: 10 })).toMatch(
      /Divided/
    );
    expect(verdictLine({ liked: 20, finished: null, hours: 10 })).toMatch(
      /hard sell/
    );
  });

  it('speaks from the finishing rate alone when there are no ratings', () => {
    expect(verdictLine({ liked: null, finished: 50, hours: 10 })).toMatch(
      /Most who own it/
    );
    expect(verdictLine({ liked: null, finished: 10, hours: 10 })).toMatch(
      /Few who own it/
    );
  });
});
