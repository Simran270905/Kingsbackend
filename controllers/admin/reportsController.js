import { sendSuccess, sendError, catchAsync } from '../../utils/errorHandler.js'
import SharedAnalyticsService from '../../services/sharedAnalyticsService.js'

/**
 * Reports Controller - Advanced view of Analytics
 * Uses the same shared service as Analytics to ensure consistency
 */

// GET comprehensive reports data - Using Shared Service
export const getReports = catchAsync(async (req, res) => {
  const { range = '30', format = 'json' } = req.query // days
  
  console.log(` Fetching REPORTS via SHARED SERVICE - Range: ${range} days, Format: ${format}`)
  
  try {
    const reportsData = await SharedAnalyticsService.getAnalyticsData(range)
    
    console.log(` Shared Reports Service - Revenue: ${reportsData.summary.totalRevenue}, Orders: ${reportsData.summary.totalOrders}`)
    
    // Add reports-specific formatting
    const formattedReports = {
      ...reportsData,
      reportType: 'comprehensive',
      generatedAt: new Date().toISOString(),
      dataSource: 'Orders Collection (Single Source of Truth)'
    }
    
    sendSuccess(res, formattedReports)
  } catch (error) {
    console.error(' Shared Reports Service error:', error)
    sendError(res, error.message || 'Failed to fetch reports data', 500)
  }
})

// GET reports summary cards - Using Shared Service
export const getReportsSummary = catchAsync(async (req, res) => {
  const { range = '30' } = req.query // days
  
  console.log(` Fetching REPORTS SUMMARY via SHARED SERVICE - Range: ${range} days`)
  
  try {
    const analyticsData = await SharedAnalyticsService.getAnalyticsData(range)
    
    // Extract only summary data for cards
    const summary = {
      stats: {
        revenue: analyticsData.summary.totalRevenue,
        orders: analyticsData.summary.totalOrders,
        avgOrder: analyticsData.summary.avgOrderValue,
        totalSold: analyticsData.summary.totalSold
      },
      users: analyticsData.summary.totalUsers,
      salesTrend: analyticsData.salesTrend,
      ordersChart: analyticsData.ordersChart,
      categoryStats: analyticsData.categoryStats,
      lastUpdated: analyticsData.lastUpdated
    }
    
    console.log(` Reports Summary - Revenue: ${summary.stats.revenue}, Orders: ${summary.stats.orders}`)
    
    sendSuccess(res, summary)
  } catch (error) {
    console.error(' Reports Summary error:', error)
    sendError(res, error.message || 'Failed to fetch reports summary', 500)
  }
})

// GET sales trend data - Using Shared Service
export const getSalesTrend = catchAsync(async (req, res) => {
  const { range = '30', metric = 'revenue' } = req.query // days, metric type
  
  console.log(` Fetching SALES TREND via SHARED SERVICE - Range: ${range} days, Metric: ${metric}`)
  
  try {
    const analyticsData = await SharedAnalyticsService.getAnalyticsData(range)
    
    // Format sales trend based on metric
    let trendData = analyticsData.salesTrend
    
    if (metric === 'orders') {
      trendData = analyticsData.salesTrend.map(item => ({
        ...item,
        value: item.orders
      }))
    } else if (metric === 'itemsSold') {
      trendData = analyticsData.salesTrend.map(item => ({
        ...item,
        value: item.itemsSold
      }))
    } else {
      trendData = analyticsData.salesTrend.map(item => ({
        ...item,
        value: item.revenue
      }))
    }
    
    console.log(` Sales Trend - ${trendData.length} data points for ${metric}`)
    
    sendSuccess(res, {
      salesTrend: trendData,
      metric,
      range,
      lastUpdated: analyticsData.lastUpdated
    })
  } catch (error) {
    console.error(' Sales Trend error:', error)
    sendError(res, error.message || 'Failed to fetch sales trend', 500)
  }
})

// GET category distribution - Using Shared Service
export const getCategoryDistribution = catchAsync(async (req, res) => {
  const { range = '30' } = req.query // days
  
  console.log(` Fetching CATEGORY DISTRIBUTION via SHARED SERVICE - Range: ${range} days`)
  
  try {
    const analyticsData = await SharedAnalyticsService.getAnalyticsData(range)
    
    // Format category data for charts
    const categoryData = analyticsData.categoryStats.map(cat => ({
      name: cat._id || 'Uncategorized',
      value: cat.total,
      revenue: cat.revenue
    }))
    
    console.log(` Category Distribution - ${categoryData.length} categories`)
    
    sendSuccess(res, {
      categoryStats: categoryData,
      range,
      lastUpdated: analyticsData.lastUpdated
    })
  } catch (error) {
    console.error(' Category Distribution error:', error)
    sendError(res, error.message || 'Failed to fetch category distribution', 500)
  }
})

// GET orders chart data - Using Shared Service
export const getOrdersChart = catchAsync(async (req, res) => {
  const { range = '30' } = req.query // days
  
  console.log(` Fetching ORDERS CHART via SHARED SERVICE - Range: ${range} days`)
  
  try {
    const analyticsData = await SharedAnalyticsService.getAnalyticsData(range)
    
    // Format orders data for charts
    const ordersData = analyticsData.ordersChart.map(status => ({
      name: status._id || 'Unknown',
      value: status.count,
      percentage: 0 // Will be calculated on frontend
    }))
    
    // Calculate percentages
    const totalOrders = ordersData.reduce((sum, item) => sum + item.value, 0)
    ordersData.forEach(item => {
      item.percentage = totalOrders > 0 ? Math.round((item.value / totalOrders) * 100) : 0
    })
    
    console.log(` Orders Chart - ${ordersData.length} status types`)
    
    sendSuccess(res, {
      ordersChart: ordersData,
      totalOrders,
      range,
      lastUpdated: analyticsData.lastUpdated
    })
  } catch (error) {
    console.error(' Orders Chart error:', error)
    sendError(res, error.message || 'Failed to fetch orders chart', 500)
  }
})

// GET export data - Using Shared Service
export const getExportData = catchAsync(async (req, res) => {
  const { range = '30', format = 'csv' } = req.query // days, format
  
  console.log(` Getting EXPORT DATA via SHARED SERVICE - Range: ${range} days, Format: ${format}`)
  
  try {
    const exportData = await SharedAnalyticsService.getExportData(range)
    
    console.log(` Export Data - ${exportData.length} orders ready for export`)
    
    if (format === 'csv') {
      // Convert to CSV
      const headers = Object.keys(exportData[0]).join(',')
      const csvRows = exportData.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value
        ).join(',')
      )
      const csv = [headers, ...csvRows].join('\n')
      
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename=orders-report-${new Date().toISOString().split('T')[0]}.csv`)
      res.send(csv)
    } else {
      // Return JSON
      sendSuccess(res, {
        exportData,
        range,
        format,
        generatedAt: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error(' Export Data error:', error)
    sendError(res, error.message || 'Failed to generate export data', 500)
  }
})

// POST trigger reports refresh - Using Shared Service
export const triggerReportsRefresh = catchAsync(async (req, res) => {
  console.log(' Triggering REPORTS refresh via SHARED SERVICE')
  
  try {
    const refreshResult = await SharedAnalyticsService.triggerRefresh()
    
    sendSuccess(res, {
      ...refreshResult,
      source: 'Reports Controller'
    })
  } catch (error) {
    console.error(' Reports refresh trigger error:', error)
    sendError(res, error.message || 'Failed to trigger reports refresh', 500)
  }
})
