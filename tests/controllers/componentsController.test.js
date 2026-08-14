import { describe, it, expect, vi } from 'vitest';
import { serializeComponent, listComponents, getComponentById } from '../../src/controllers/componentsController.js';
import { loadComponents } from '../../server/models/component.js';

function createMockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('serializeComponent', () => {
  it('coerces a string uptimePercent into a number', () => {
    const result = serializeComponent({ id: 'c1', name: 'API', healthState: 'operational', uptimePercent: '99.95' });

    expect(result.uptimePercent).toBe(99.95);
    expect(typeof result.uptimePercent).toBe('number');
  });

  it('passes through a numeric uptimePercent unchanged', () => {
    const result = serializeComponent({ id: 'c1', name: 'API', healthState: 'operational', uptimePercent: 99.95 });

    expect(result.uptimePercent).toBe(99.95);
  });

  it('produces an identical field shape whether used for a list item or a single item', () => {
    const input = { id: 'c1', name: 'API', description: 'desc', category: 'API', healthState: 'operational', uptimePercent: 100 };

    const asListItem = serializeComponent(input);
    const asSingleItem = serializeComponent(input);

    expect(asListItem).toEqual(asSingleItem);
    expect(Object.keys(asListItem).sort()).toEqual(['category', 'description', 'healthState', 'id', 'name', 'uptimePercent'].sort());
  });

  it('includes id, name, and healthState verbatim from the input', () => {
    const result = serializeComponent({ id: 'seed-comp-db', name: 'Primary Database', healthState: 'partial_outage', uptimePercent: 95.1 });

    expect(result.id).toBe('seed-comp-db');
    expect(result.name).toBe('Primary Database');
    expect(result.healthState).toBe('partial_outage');
  });
});

describe('listComponents', () => {
  it('responds 200 with every seeded component serialized', () => {
    const req = {};
    const res = createMockRes();

    listComponents(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body).toHaveLength(loadComponents().length);
    for (const component of body) {
      expect(typeof component.id).toBe('string');
      expect(typeof component.healthState).toBe('string');
      expect(typeof component.uptimePercent).toBe('number');
    }
  });
});

describe('getComponentById', () => {
  it('responds 200 with the matching component including healthState and numeric uptimePercent', () => {
    const [firstComponent] = loadComponents();
    const req = { params: { id: firstComponent.id } };
    const res = createMockRes();

    getComponentById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: firstComponent.id,
        healthState: firstComponent.healthState,
        uptimePercent: Number(firstComponent.uptimePercent),
      }),
    );
  });

  it('responds 404 with an error body when the id does not match any seeded component', () => {
    const req = { params: { id: 'does-not-exist' } };
    const res = createMockRes();

    getComponentById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });
});
