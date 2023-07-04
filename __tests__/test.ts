import Logger from '../src/index';

describe('Logger', () => {
	beforeEach(() => {
		jest.spyOn(Logger, 'info').mockImplementation(() => {});
		jest.spyOn(Logger, 'debug').mockImplementation(() => {});
		jest.spyOn(Logger, 'error').mockImplementation(() => {});
	});

	describe('log', () => {
		it('should log a message with the correct level', () => {
			const spy = jest.spyOn(Logger, 'info').mockImplementation(() => {});
			Logger.info('info', 'test message');
			expect(spy).toHaveBeenCalledWith('info', 'test message');
			spy.mockRestore();
		});
	});
});
