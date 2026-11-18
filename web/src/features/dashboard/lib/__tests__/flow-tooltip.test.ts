import { DomTooltipHandler } from '@visactor/vchart'
import { afterEach, describe, expect, test, vi } from 'vitest'

import type { FlowQuotaDataItem } from '@/features/dashboard/types'

import { buildDashboardFlowData, buildFlowSankeySpec } from '../flow'

// VChart only enables its DOM tooltip when the environment has a 2D canvas,
// which jsdom lacks. The check runs once, when VChart is imported.
vi.hoisted(() => {
  HTMLCanvasElement.prototype.getContext = (() => ({
    isPointInPath: () => false,
    isPointInStroke: () => false,
  })) as unknown as HTMLCanvasElement['getContext']
})

// Names that users enter must be rendered as text in tooltip titles.
class TitleRenderingTooltipHandler extends DomTooltipHandler {
  renderTitle(value: string): HTMLElement {
    this._component = {
      getSpec: () => ({ className: 'vchart-tooltip-test' }),
    } as unknown as typeof this._component
    this._domStyle = {
      panel: {},
      row: {},
      title: {},
      shape: {},
      key: {},
      value: {},
    }
    this.initRootDom()
    this._updateDomStringByCol({ title: { value }, content: [] })
    return this.getRootDom()
  }
}

const markupName = '<b>token</b>'

const row: FlowQuotaDataItem = {
  user_id: 1,
  username: 'alice',
  node_name: 'node-a',
  token_id: 11,
  token_name: markupName,
  use_group: 'vip',
  channel_id: 101,
  channel_name: 'east',
  model_name: 'gpt-4.1',
  quota: 100,
  token_used: 40,
  count: 2,
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('flow sankey tooltip', () => {
  test('renders an HTML token name in the node tooltip title as text', () => {
    const result = buildDashboardFlowData([row], 'quota', { role: 'root' })
    const spec = buildFlowSankeySpec(result.flow, 'Flow')
    const tokenNode = spec.data[0].values[0].nodes.find(
      (node: Record<string, unknown>) => node.key === 'token:11'
    )
    const title = spec.tooltip.mark.title.value(tokenNode)

    const root = new TitleRenderingTooltipHandler().renderTitle(title)

    expect(root.querySelector('b')).toBeNull()
    expect(root.textContent).toContain(markupName)
  })
})
