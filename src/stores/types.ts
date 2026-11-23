export interface Institution {
  id: string
  name: string
  rorId: string
  oaiEndpoint: string | null
  oaiMetadataPrefix: string | null
  rebiunCode: string | null
  lastHarvestAt: string | null
  oaiStatus: 'ACTIVE' | 'INACTIVE' | 'UNREACHABLE' | 'DEGRADED'
  totalPublications: number
}

export interface InstitutionPageResponse {
  content: Institution[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
}

export interface InstitutionSummary {
  institutionId: string
  institutionName: string
  totalPublications: number
  oaStatusCounts: Record<string, number>
  oaPercentage: number
  foundInRepository: number
  yearlyBreakdown: Record<string, Record<string, number>>
}

export interface ApcYearBreakdown {
  year: number
  totalCost: number
  publicationsCount: number
  publicationsWithPrice: number
  coveredByAgreements: number
}

export interface ApcEstimate {
  institutionId: string
  institutionName: string
  totalEstimatedCost: number
  totalPublications: number
  publicationsWithPrice: number
  publicationsWithoutPrice: number
  coveredByAgreements: number
  directCost: number
  breakdownByYear: Record<string, ApcYearBreakdown>
}

export interface OaBreakdown {
  institutionId: string
  institutionName: string
  yearlyStatusCounts: Record<string, Record<string, number>>
  yearlyOaPercentage: Record<string, number>
}

export interface PublicationItem {
  id: string
  doi: string
  title: string
  publicationYear: number
  journalIssn: string | null
  journalName: string | null
  oaStatusOpenalex: string | null
  oaStatusResolved: string | null
  repositoryUrl: string | null
  source: string | null
  apcEstimatedEur: number | null
  apcCoveredByAgreement: boolean | null
}

export interface PublicationPageResponse {
  content: PublicationItem[]
  page: {
    totalElements: number
    totalPages: number
    number: number
    size: number
  }
}

export interface JournalApcItem {
  journalName: string
  journalIssn: string
  publicationCount: number
  totalApcCost: number
}

export interface InstitutionScatterItem {
  institutionId: string
  institutionName: string
  totalPublications: number
  oaPercentage: number
  totalApcCost: number
  hasApcData: boolean
}

export interface RegionalStats {
  community: string
  universityCount: number
  totalPublications: number
  oaPercentage: number
  strongOaPct: number
  repositoryPct: number
  diamondPct: number
  goldPct: number
  greenPct: number
  hybridPct: number
  bronzePct: number
  closedPct: number
}

export interface HistoricalYear {
  year: number
  totalPublications: number
  diamondCount: number
  goldCount: number
  greenCount: number
  hybridCount: number
  bronzeCount: number
  closedCount: number
  repositoryCount: number
  strongOaPct: number
  repositoryPct: number
  broadOaPct: number
  totalApcCost: number
  articlesWithApc: number
  averageApc: number
}

export interface HistoricalData {
  institutionId: string
  institutionName: string
  yearlyData: HistoricalYear[]
}

export interface PublisherApcItem {
  publisher: string
  totalApc: number
  articleCount: number
  averageApc: number
  stdDev: number | null
  percentage: number
  goldCount: number
  hybridCount: number
}

export interface PublisherArticleItem {
  id: string
  doi: string | null
  title: string | null
  journalName: string | null
  journalIssn: string | null
  apcEstimatedEur: number
  oaStatus: string | null
}

export interface JournalArticleItem {
  id: string
  doi: string | null
  title: string | null
  journalName: string | null
  journalIssn: string | null
  apcEstimatedEur: number
  oaStatus: string | null
}
