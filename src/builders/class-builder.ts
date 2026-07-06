import { BaseBuilder } from './base-builder.js';
import { ClassDiagramInput, ClassElement, Relationship } from '../types/class-diagram.js';
import {
  CLASS_STYLE,
  ABSTRACT_CLASS_STYLE,
  INTERFACE_STYLE,
  ENUM_STYLE,
  ASSOCIATION_STYLE,
  INHERITANCE_STYLE,
  COMPOSITION_STYLE,
  AGGREGATION_STYLE,
  DEPENDENCY_STYLE,
  REALIZATION_STYLE,
} from '../utils/styles.js';
import { CLASS_WIDTH, CLASS_MIN_HEIGHT, verticalLayout } from '../utils/layout.js';

const ROW_HEIGHT = 20;
const HEADER_HEIGHT = 28;
const STEREOTYPE_LINE_HEIGHT = 14;

/**
 * Builder for UML Class Diagrams.
 * Produces mxGraph cells with table-based HTML labels for class compartments.
 */
export class ClassDiagramBuilder extends BaseBuilder {
  private classIds: Map<string, string> = new Map();
  private classHeights: Map<string, number> = new Map();

  constructor(private input: ClassDiagramInput) {
    super();
  }

  build(): void {
    // Create class vertex cells
    for (const cls of this.input.classes) {
      const id = this.createClassElement(cls);
      this.classIds.set(cls.name, id);
    }

    // Auto-create inheritance from extends field
    for (const cls of this.input.classes) {
      if (cls.extends && cls.extends !== cls.name) {
        const has = (this.input.relationships ?? []).some(
          (r) => r.from === cls.name && r.to === cls.extends && r.type === 'inheritance',
        );
        if (!has) {
          this.createRelationship({ from: cls.name, to: cls.extends, type: 'inheritance' });
        }
      }
    }

    // Create relationship edge cells
    for (const rel of this.input.relationships ?? []) {
      this.createRelationship(rel);
    }
  }

  layout(): void {
    const startX = 60;
    const startY = 60;
    const gapX = 80;
    const gapY = 80;
    const cols = Math.min(this.input.classes.length, 3);

    this.input.classes.forEach((cls, i) => {
      const cellId = this.classIds.get(cls.name);
      if (!cellId) return;

      const row = Math.floor(i / cols);
      const col = i % cols;
      const height = this.classHeights.get(cls.name) ?? CLASS_MIN_HEIGHT;
      const cell = this.cells.find((c) => c.id === cellId);
      if (cell?.geometry) {
        cell.geometry.x = startX + col * (CLASS_WIDTH + gapX);
        cell.geometry.y = startY + row * (height + gapY);
        cell.geometry.width = CLASS_WIDTH;
        cell.geometry.height = height;
      }
    });
  }

  private createClassElement(cls: ClassElement): string {
    const htmlLabel = this.buildClassHtml(cls);
    const height = this.calculateClassHeight(cls);
    this.classHeights.set(cls.name, height);

    const style = this.getClassStyle(cls);
    return this.addVertex(htmlLabel, style, 0, 0, CLASS_WIDTH, height);
  }

  private getClassStyle(cls: ClassElement): string {
    if (cls.stereotype === 'interface') return INTERFACE_STYLE;
    if (cls.stereotype === 'enum') return ENUM_STYLE;
    if (cls.isAbstract || cls.stereotype === 'abstract') return ABSTRACT_CLASS_STYLE;
    return CLASS_STYLE;
  }

  private buildClassHtml(cls: ClassElement): string {
    const parts: string[] = ['<div style="margin:0;text-align:center;">'];

    // Stereotype line
    const stereotype = this.getStereotypeText(cls);
    if (stereotype) {
      parts.push(`<i style="font-size:11px;">${stereotype}</i><br>`);
    }

    // Class name (bold, italic if abstract)
    const nameTag = cls.isAbstract ? `<i>${cls.name}</i>` : cls.name;
    parts.push(`<b>${nameTag}</b>`);
    parts.push('</div>');

    // Attributes compartment
    const attrs = cls.attributes ?? [];
    if (attrs.length > 0) {
      parts.push('<hr size="1">');
      for (const attr of attrs) {
        const vis = attr.visibility ?? '+';
        const typeStr = attr.type && attr.type !== 'void' ? `: ${attr.type}` : '';
        parts.push(`<div style="margin:0;text-align:left;padding-left:5px;">${vis} ${attr.name}${typeStr}</div>`);
      }
    }

    // Methods compartment
    const methods = cls.methods ?? [];
    if (methods.length > 0) {
      parts.push('<hr size="1">');
      for (const method of methods) {
        const vis = method.visibility ?? '+';
        const params = (method.params ?? []).map((p) => `${p.name}: ${p.type}`).join(', ');
        const paramStr = params ? `(${params})` : '()';
        const returnStr = method.returnType && method.returnType !== 'void' ? `: ${method.returnType}` : '';
        parts.push(`<div style="margin:0;text-align:left;padding-left:5px;">${vis} ${method.name}${paramStr}${returnStr}</div>`);
      }
    }

    return parts.join('');
  }

  private getStereotypeText(cls: ClassElement): string {
    if (cls.stereotype === 'interface') return '&lt;&lt;interface&gt;&gt;';
    if (cls.stereotype === 'enum') return '&lt;&lt;enum&gt;&gt;';
    if (cls.stereotype === 'abstract' || cls.isAbstract) return '&lt;&lt;abstract&gt;&gt;';
    return '';
  }

  private calculateClassHeight(cls: ClassElement): number {
    const attrs = cls.attributes ?? [];
    const methods = cls.methods ?? [];
    const hasStereotype = !!this.getStereotypeText(cls);

    let h = HEADER_HEIGHT + (hasStereotype ? STEREOTYPE_LINE_HEIGHT : 0);
    if (attrs.length > 0) h += 4 + attrs.length * ROW_HEIGHT;  // hr + rows
    if (methods.length > 0) h += 4 + methods.length * ROW_HEIGHT; // hr + rows
    if (attrs.length === 0 && methods.length === 0) h += 10; // min padding
    return Math.max(h, CLASS_MIN_HEIGHT);
  }

  private createRelationship(rel: Relationship): string {
    const sourceId = this.classIds.get(rel.from);
    const targetId = this.classIds.get(rel.to);
    if (!sourceId || !targetId) return '';

    const style = this.getRelationStyle(rel.type);
    const label = rel.label ?? '';
    return this.addEdge(label, style, sourceId, targetId);
  }

  private getRelationStyle(type: string): string {
    switch (type) {
      case 'inheritance': return INHERITANCE_STYLE;
      case 'association': return ASSOCIATION_STYLE;
      case 'aggregation': return AGGREGATION_STYLE;
      case 'composition': return COMPOSITION_STYLE;
      case 'dependency': return DEPENDENCY_STYLE;
      case 'realization': return REALIZATION_STYLE;
      default: return ASSOCIATION_STYLE;
    }
  }
}
