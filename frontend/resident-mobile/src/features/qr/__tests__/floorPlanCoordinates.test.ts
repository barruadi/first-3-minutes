import {
  displayPointToWorld,
  FLOOR_PLAN_SOURCE_SIZE,
  worldToDisplayPoint,
} from '../floorPlanCoordinates';

const meta = {
  scaleMetersPerPixel: 6.6 / FLOOR_PLAN_SOURCE_SIZE,
  originX: -3.3,
  originZ: -3.3,
};

describe('floor-plan coordinate conversion', () => {
  it('maps mobile display pixels through the original 512px image space', () => {
    const world = displayPointToWorld({ x: 180, y: 90 }, 360, meta);
    expect(world.posX).toBeCloseTo(0, 8);
    expect(world.posZ).toBeCloseTo(1.65, 8);
  });

  it('round-trips a tap without changing its displayed position', () => {
    const tapped = { x: 73.25, y: 281.75 };
    const world = displayPointToWorld(tapped, 360, meta);
    const displayed = worldToDisplayPoint(world, 360, meta);
    expect(displayed.x).toBeCloseTo(tapped.x, 8);
    expect(displayed.y).toBeCloseTo(tapped.y, 8);
  });

  it('produces the same source pixel used by Guest WebAR', () => {
    const tapped = { x: 270, y: 120 };
    const world = displayPointToWorld(tapped, 360, meta);
    const guestPx = (world.posX - meta.originX) / meta.scaleMetersPerPixel;
    const guestPy = FLOOR_PLAN_SOURCE_SIZE - (world.posZ - meta.originZ) / meta.scaleMetersPerPixel;
    expect(guestPx).toBeCloseTo(384, 8);
    expect(guestPy).toBeCloseTo(512 / 3, 8);
  });
});
