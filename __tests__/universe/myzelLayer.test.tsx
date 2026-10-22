import React from 'react';
import { render } from '@testing-library/react';
import { MyzelLayer } from '@/components/universe/MyzelLayer';

const planets = [{ id: 'a', x: 30, y: 40 }, { id: 'b', x: 70, y: 60 }];

function fakeContext() {
  return {
    scale: jest.fn(), setTransform: jest.fn(), clearRect: jest.fn(), drawImage: jest.fn(),
    beginPath: jest.fn(), moveTo: jest.fn(), quadraticCurveTo: jest.fn(), stroke: jest.fn(),
    arc: jest.fn(), fill: jest.fn(), save: jest.fn(), restore: jest.fn(),
  };
}

describe('MyzelLayer', () => {
  afterEach(() => jest.restoreAllMocks());

  it('neither draws nor throws when the plane is 0 px (phone first layout pass)', () => {
    const getContext = jest.spyOn(HTMLCanvasElement.prototype, 'getContext');
    expect(() => render(<div><MyzelLayer planets={planets} focusId="a" /></div>)).not.toThrow();
    expect(getContext).not.toHaveBeenCalled();
  });

  it('draws the network once the plane has a size, never from an empty canvas', () => {
    jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(400);
    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(300);
    const ctx = fakeContext();
    (jest.spyOn(HTMLCanvasElement.prototype, 'getContext') as jest.SpyInstance).mockReturnValue(ctx);

    render(<div><MyzelLayer planets={planets} /></div>);

    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    const [image] = ctx.drawImage.mock.calls[0] as [HTMLCanvasElement];
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
  });

  it('survives a browser without a 2d context', () => {
    jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(400);
    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(300);
    (jest.spyOn(HTMLCanvasElement.prototype, 'getContext') as jest.SpyInstance).mockReturnValue(null);

    expect(() => render(<div><MyzelLayer planets={planets} /></div>)).not.toThrow();
  });
});
