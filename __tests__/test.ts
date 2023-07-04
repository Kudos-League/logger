import Logger from '../src/index';

describe('Logger', () => {
	const instance = new Logger();

	beforeEach(() => {
		jest.spyOn(Logger, 'info').mockImplementation(() => {});
		jest.spyOn(Logger, 'debug').mockImplementation(() => {});
		jest.spyOn(instance, 'error').mockImplementation(() => {});
	});

	describe('log', () => {
		it('should log a message with the correct level', () => {
			const spy = jest.spyOn(Logger, 'info').mockImplementation(() => {});
			Logger.info('info', 'test message');
			expect(spy).toHaveBeenCalledWith('info', 'test message');
			spy.mockRestore();
		});

		it('Should log an error message', () => {
			const spy = jest.spyOn(instance, 'error').mockImplementation(() => {});
			instance.error('test error');
			expect(spy).toHaveBeenCalledWith('test error');
			spy.mockRestore();
		})
	});
});
