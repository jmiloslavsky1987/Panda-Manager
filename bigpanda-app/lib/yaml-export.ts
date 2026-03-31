import yaml from 'js-yaml'

export function parseYaml(yamlString: string): unknown {
  return yaml.load(yamlString)
}

export function serializeProjectToYaml(doc: Record<string, unknown>): string {
  return yaml.dump(doc, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  })
}
