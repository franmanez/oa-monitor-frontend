import * as echarts from 'echarts/core'
import { TreemapChart } from 'echarts/charts'
import { SVGRenderer } from 'echarts/renderers'

echarts.use([TreemapChart, SVGRenderer])

function render(position) {
  const chart = echarts.init(null, null, { renderer: 'svg', ssr: true, width: 800, height: 400 })
  chart.setOption({
    animation: false,
    series: [{
      type: 'treemap',
      roam: false,
      nodeClick: false,
      breadcrumb: { show: false },
      width: '100%',
      height: '100%',
      left: 0, top: 0,
      label: { show: true, position, formatter: '{b}', padding: [7, 9] },
      data: [
        { name: 'AAAAA', value: 60 },
        { name: 'BBBBB', value: 30 },
        { name: 'CCCCC', value: 10 }
      ]
    }]
  })
  return chart.renderToSVGString()
}

function analyze(position) {
  const svg = render(position)
  // rect y text positions for the first (largest) node
  const rects = [...svg.matchAll(/<rect[^>]*x="([\d.]+)"[^>]*y="([\d.]+)"[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"/g)]
  const texts = [...svg.matchAll(/<text[^>]*x="(-?[\d.]+)"[^>]*y="(-?[\d.]+)"/g)]
  const groups = [...svg.matchAll(/<g transform="translate\(([\d.]+),\s*([\d.]+)\)"[^>]*>/g)]
  console.log('--- position:', position)
  console.log('rects:', rects.slice(0, 3).map(m => m.slice(1, 5).join(',')))
  console.log('texts:', texts.map(m => m[1] + ',' + m[2]))
  console.log('groups:', groups.map(m => m[1] + ',' + m[2]))
}

analyze('inside')
analyze('insideTopLeft')
