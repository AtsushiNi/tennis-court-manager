import { Table, Button, Space, message, Typography, Card, Progress as ProgressBar } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import type { ColumnsType } from 'antd/es/table'
import type {
  AccountExpirationItem,
  AccountExpirationResult,
  Member,
  Profile,
  Progress
} from '../../../common/types'

interface AccountExpirationPageProps {
  profile: Profile | null
}

type TableRow = AccountExpirationItem & { key: string }

const expirationDateToEpoch = (expirationDate?: string): number => {
  if (!expirationDate) return Number.POSITIVE_INFINITY

  // 例: 2027年2月9日
  const jp = expirationDate.match(/^\s*(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日\s*$/)
  if (jp) {
    const [, y, m, d] = jp
    return new Date(Number(y), Number(m) - 1, Number(d)).getTime()
  }

  // フォールバック（解釈不能なら先頭扱い）
  const t = Date.parse(expirationDate)
  return Number.isFinite(t) ? t : 0
}

const AccountExpirationPage = ({ profile }: AccountExpirationPageProps): React.JSX.Element => {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [result, setResult] = useState<AccountExpirationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  useEffect(() => {
    return window.api.onGetAccountExpirationsProgress((p) => {
      setProgress(p)
    })
  }, [])

  const rows: TableRow[] = useMemo(() => {
    const sortedItems = [...(result?.items ?? [])].sort((a, b) => {
      return expirationDateToEpoch(a.expirationDate) - expirationDateToEpoch(b.expirationDate)
    })

    return sortedItems.map((item) => ({
      ...item,
      key: String(item.member.id)
    }))
  }, [result])

  const run = async (): Promise<void> => {
    if (!profile) {
      messageApi.warning('プロファイルが選択されていません')
      return
    }

    setLoading(true)
    setResult(null)
    setProgress({ current: 0, total: 1, message: '開始中...' })
    try {
      const data = await window.api.getAccountExpirations(profile.id)
      if (!data) {
        throw new Error('有効期限一覧の取得に失敗しました')
      }
      setResult(data)
    } catch (err) {
      console.error('有効期限一覧取得エラー:', err)
      messageApi.error('有効期限一覧の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const exportCsv = async (): Promise<void> => {
    if (!profile) {
      messageApi.warning('プロファイルが選択されていません')
      return
    }
    if (!result?.items?.length) {
      messageApi.warning('エクスポートするデータがありません')
      return
    }

    const header = ['氏名', '登録番号', 'パスワード', '有効期限', 'ステータス']
    const escape = (v: unknown): string => {
      const s = String(v ?? '')
      // CSVの基本的なエスケープ（ダブルクォートで囲って、内部の"は""にする）
      return `"${s.replace(/"/g, '""')}"`
    }
    const lines = [
      header.join(','),
      ...rows.map((item) =>
        [
          item.member.name,
          item.member.id,
          item.member.password,
          item.expirationDate ?? '',
          item.status
        ]
          .map(escape)
          .join(',')
      )
    ]
    const csv = lines.join('\n')

    const now = new Date()
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`
    const fileName = `account_expiration_${profile.name}_${timestamp}.csv`

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)

    messageApi.success('CSVをエクスポートしました')
  }

  const memberColumns: ColumnsType<Member> = [
    { title: '氏名', dataIndex: 'name', key: 'name' },
    { title: '登録番号', dataIndex: 'id', key: 'id' },
    { title: 'パスワード', dataIndex: 'password', key: 'password' }
  ]

  const columns: ColumnsType<TableRow> = [
    { title: '氏名', key: 'name', render: (_, r) => r.member.name },
    { title: '登録番号', key: 'id', render: (_, r) => r.member.id },
    { title: 'パスワード', key: 'password', render: (_, r) => r.member.password },
    {
      title: '有効期限',
      dataIndex: 'expirationDate',
      key: 'expirationDate',
      render: (v) => v ?? '—'
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status'
    }
  ]

  let percent = progress ? Math.floor((progress.current / progress.total) * 100) : 0
  if (loading) {
    percent = Math.min(99, percent)
  }

  return (
    <>
      {contextHolder}
      <div>
        <Typography.Title level={2} style={{ marginBottom: '20px' }}>
          有効期限一覧
        </Typography.Title>
        <Card>
          <Space>
            <Button type="primary" onClick={run} loading={loading} disabled={loading}>
              有効期限チェックを実行する
            </Button>
            <Button onClick={exportCsv} disabled={loading || !result?.items?.length}>
              CSVエクスポート
            </Button>
          </Space>
          {progress && (
            <Space direction="vertical" style={{ marginTop: 16, width: '100%' }}>
              <ProgressBar percent={percent} />
              <Typography.Text>
                {progress.message} ({progress.current}/{progress.total})
              </Typography.Text>
            </Space>
          )}
        </Card>

        <Card title="有効期限一覧">
          <Table
            columns={columns}
            dataSource={rows}
            locale={{ emptyText: '結果がありません' }}
            loading={loading}
          />
        </Card>

        <Card title="ログイン失敗メンバー">
          <Table
            columns={memberColumns}
            dataSource={result?.loginFailedMembers}
            locale={{ emptyText: 'ログインに失敗したメンバーがありません' }}
            loading={loading}
          />
        </Card>
        <Card title="エラーメンバー(手動で確認してください)">
          <Table
            columns={memberColumns}
            dataSource={result?.errorMembers}
            locale={{ emptyText: 'エラーがありません' }}
            loading={loading}
          />
        </Card>
      </div>
    </>
  )
}

export default AccountExpirationPage
