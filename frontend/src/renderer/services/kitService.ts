/**
 * Kit service — manages kit templates and assembled kits via localStorage.
 * Templates define item requirements; assembled kits track actual assemblies.
 */

const TEMPLATES_KEY = 'bf_kit_templates'
const ASSEMBLED_KEY = 'bf_kit_assembled'

export interface KitItem {
  itemId: string
  itemName: string
  requiredQty: number
  unit: string | null
}

export interface KitTemplate {
  id: string
  name: string
  items: KitItem[]
  createdAt: string
}

export interface AssembledKit {
  id: string
  templateId: string
  templateName: string
  assembledAt: string
}

function loadTemplates(): KitTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATES_KEY) ?? '[]') as KitTemplate[]
  } catch {
    return []
  }
}

function saveTemplates(templates: KitTemplate[]): void {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
}

function loadAssembled(): AssembledKit[] {
  try {
    return JSON.parse(localStorage.getItem(ASSEMBLED_KEY) ?? '[]') as AssembledKit[]
  } catch {
    return []
  }
}

function saveAssembled(kits: AssembledKit[]): void {
  localStorage.setItem(ASSEMBLED_KEY, JSON.stringify(kits))
}

export const kitService = {
  getTemplates(): KitTemplate[] {
    return loadTemplates()
  },

  createTemplate(name: string, items: KitItem[]): KitTemplate {
    const template: KitTemplate = {
      id: crypto.randomUUID(),
      name: name.trim(),
      items,
      createdAt: new Date().toISOString(),
    }
    const templates = loadTemplates()
    templates.push(template)
    saveTemplates(templates)
    return template
  },

  deleteTemplate(id: string): void {
    saveTemplates(loadTemplates().filter((t) => t.id !== id))
    // Also remove assembled kits for this template
    saveAssembled(loadAssembled().filter((k) => k.templateId !== id))
  },

  getAssembledKits(templateId?: string): AssembledKit[] {
    const kits = loadAssembled()
    return templateId ? kits.filter((k) => k.templateId === templateId) : kits
  },

  assembleKit(template: KitTemplate): AssembledKit {
    const kit: AssembledKit = {
      id: crypto.randomUUID(),
      templateId: template.id,
      templateName: template.name,
      assembledAt: new Date().toISOString(),
    }
    const kits = loadAssembled()
    kits.push(kit)
    saveAssembled(kits)
    return kit
  },

  disassembleKit(kitId: string): void {
    saveAssembled(loadAssembled().filter((k) => k.id !== kitId))
  },

  /**
   * Calculate how many complete kits can be assembled from current inventory.
   * inventoryByItemId maps item ID → available quantity.
   */
  calculateAvailable(template: KitTemplate, inventoryByItemId: Map<string, number>): number {
    if (template.items.length === 0) return 0
    const counts = template.items.map((item) => {
      const available = inventoryByItemId.get(item.itemId) ?? 0
      return Math.floor(available / item.requiredQty)
    })
    return Math.min(...counts)
  },
}
