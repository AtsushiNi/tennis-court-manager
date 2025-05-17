import { Card, Button, message, Progress, Space, Typography, Table, Tag } from 'antd'
import type { LotteryResult, Profile } from '../../../common/types'
import { useState, useEffect } from 'react'

interface Props {
  profile: Profile | null
  onNavigateToStatus?: () => void
}

interface ProgressInfo {
  current: number
  total: number
  message: string
}

export default function LotteryResultPage({
  profile,
  onNavigateToStatus
}: Props): React.JSX.Element {
  const [progress, setProgress] = useState<ProgressInfo | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasConfirmed, setHasConfirmed] = useState(false)
  const [results, setResults] = useState<LotteryResult[]>([])

  useEffect(() => {
    window.api.onUpdateLotteryResultProgress((progress) => {
      console.log(progress)
      setProgress(progress)
    })

    return () => {
      window.api.onUpdateLotteryResultProgress(() => {})
    }
  }, [])

  const handleConfirm = async (): Promise<void> => {
    setIsProcessing(true)
    setProgress(null)
    if (!profile) {
      message.error('プロファイルが選択されていません')
      return
    }

    try {
      const res = await window.api.confirmLotteryResult(profile.id)
      const sortedResults = [...res].sort((a, b) => {
        const statusOrder = { win: 1, error: 2, 'login-failed': 3 }
        return statusOrder[a.status] - statusOrder[b.status]
      })
      setResults(sortedResults)
      setIsProcessing(false)
      setHasConfirmed(true)
      message.success('抽選結果を確定しました')
    } catch (err) {
      message.error(`エラーが発生しました: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  let percent = progress ? Math.floor((progress.current / progress.total) * 100) : 0
  if (isProcessing) {
    percent = Math.min(99, percent)
  }

  const columns = [
    {
      title: 'メンバー',
      dataIndex: ['member', 'name'],
      key: 'member'
    },
    {
      title: 'ID',
      dataIndex: ['member', 'id'],
      key: 'id'
    },
    {
      title: 'パスワード',
      dataIndex: ['member', 'password'],
      key: 'password'
    },
    {
      title: '施設',
      dataIndex: 'facility',
      key: 'facility'
    },
    {
      title: '日付',
      dataIndex: 'date',
      key: 'date'
    },
    {
      title: '時間',
      dataIndex: 'time',
      key: 'time'
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'red'
        let text = ''
        if (status === 'win') {
          color = 'green'
          text = '当選'
        } else if (status === 'login-failed') {
          color = 'red'
          text = 'ログイン失敗'
        } else if (status === 'error') {
          color = 'red'
          text = 'エラー'
        }
        return <Tag color={color}>{text}</Tag>
      }
    }
  ]

  return (
    <>
      <Typography.Title level={2} style={{ marginBottom: 20 }}>抽選結果確定</Typography.Title>
      <Card bordered={false}>
        <Button
          type="primary"
          onClick={handleConfirm}
          loading={isProcessing}
          disabled={isProcessing}
        >
          抽選結果を確認・確定
        </Button>

        {progress && (
          <Space direction="vertical" style={{ marginTop: 16, width: '100%' }}>
            <Progress percent={percent} />
            <Typography.Text>
              {progress.message} ({progress.current}/{progress.total})
            </Typography.Text>
          </Space>
        )}

        {hasConfirmed && (
          <Card style={{ marginTop: 16 }} title="確定完了">
            <Typography.Text>
              状況確認をクリックして確定漏れがないことを確認してください
            </Typography.Text>
            <div style={{ marginTop: 16 }}>
              <Button type="primary" onClick={() => onNavigateToStatus?.()}>
                状況確認ページへ遷移
              </Button>
            </div>
          </Card>
        )}

        {results.length > 0 ? (
          <Table
            title={() => '抽選結果'}
            bordered
            dataSource={results}
            columns={columns}
            style={{ marginTop: 16 }}
            rowKey={(record) => record.member.id}
          />
        ) : (
          hasConfirmed && (
            <Typography.Text style={{ marginTop: 16, display: 'block' }}>
              当選結果はありません
            </Typography.Text>
          )
        )}
      </Card>
    </>
  )
}
