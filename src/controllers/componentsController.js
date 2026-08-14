// Component response serializer plus the GET /api/components (list) and
// GET /api/components/:id (detail) handlers built on top of it. Reuses the
// server package's deterministic component data loader (which already
// carries healthState/uptimePercent), mirroring the cross-package import
// pattern established by src/controllers/incidentsController.js.
import { loadComponents } from '../../server/models/component.js';

export function serializeComponent(component = {}) {
  return {
    id: component.id,
    name: component.name,
    description: component.description ?? '',
    category: component.category ?? null,
    healthState: component.healthState,
    uptimePercent: Number(component.uptimePercent),
  };
}

export function listComponents(req, res) {
  res.status(200).json(loadComponents().map(serializeComponent));
}

export function getComponentById(req, res) {
  const { id } = req.params;
  const component = loadComponents().find((candidate) => String(candidate.id) === String(id));

  if (!component) {
    return res.status(404).json({ error: 'Component not found' });
  }

  res.status(200).json(serializeComponent(component));
}
