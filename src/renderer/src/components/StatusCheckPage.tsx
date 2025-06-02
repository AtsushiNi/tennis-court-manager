import { Table, Button, Space, message, Typography, Card, Progress as ProgressBar } from 'antd'
import { useEffect, useState } from 'react'
import type { ColumnsType } from 'antd/es/table'
import {
  Profile,
  ApplicationStatus,
  Progress,
  Member,
  LotteryStatus,
  LotteryResultStatus,
  ReservationStatus
} from '../../../common/types'

interface StatusCheckPageProps {
  profile: Profile | null
}

const StatusCheckPage = ({ profile }: StatusCheckPageProps): React.JSX.Element => {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [applications, setApplications] = useState<ApplicationStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  useEffect(() => {
    return window.api.onGetApplicationStatusProgress((progress) => {
      setProgress(progress)
    })
  })

  const updateStatus = async (): Promise<void> => {
    if (!profile) return

    setLoading(true)
    try {
      const data = await window.api.getApplicationStatus(profile.id)
      setApplications(data)
    } catch (err) {
      console.error('申込み状況取得エラー:', err)
      messageApi.error('申込み状況の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const memberColumns: ColumnsType<Member> = [
    {
      title: '氏名',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '登録番号',
      dataIndex: 'id',
      key: 'id'
    },
    {
      title: 'パスワード',
      dataIndex: 'password',
      key: 'password'
    }
  ]

  const commonColumns: ColumnsType<LotteryStatus | LotteryResultStatus | ReservationStatus> = [
    {
      title: '日付',
      dataIndex: 'date',
      key: 'date'
    },
    {
      title: '時間帯',
      dataIndex: 'time',
      key: 'time'
    },
    {
      title: 'コート',
      dataIndex: 'court',
      key: 'court'
    },
    {
      title: 'メンバー',
      key: 'member',
      render: (_, record) =>
        `${record.member.name} (${record.member.id} : ${record.member.password})`
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
          状況確認
        </Typography.Title>
        <Card>
          <Button type="primary" onClick={updateStatus} loading={loading} disabled={loading}>
            状況確認を実行する
          </Button>
          {progress && (
            <Space direction="vertical" style={{ marginTop: 16, width: '100%' }}>
              <ProgressBar percent={percent} />
              <Typography.Text>
                {progress.message} ({progress.current}/{progress.total})
              </Typography.Text>
            </Space>
          )}
        </Card>
        <Card title="エラー一覧(手動で確認してください)">
          <Table
            columns={memberColumns}
            dataSource={applications?.errorMembers}
            locale={{ emptyText: 'エラーがありません' }}
            loading={loading}
          />
        </Card>
        <Card title="抽選申込み状況">
          <Table
            columns={commonColumns}
            dataSource={applications?.lotteries}
            locale={{ emptyText: '申込み履歴がありません' }}
            loading={loading}
          />
        </Card>
        <Card title="未確定の抽選結果">
          <Table
            columns={commonColumns}
            dataSource={applications?.lotteryResults}
            locale={{ emptyText: '未確定の抽選結果がありません' }}
            loading={loading}
          />
        </Card>
        <Card title="予約状況">
          <Table
            columns={commonColumns}
            dataSource={applications?.reservations}
            locale={{ emptyText: '予約中のコートがありません' }}
            loading={loading}
          />
        </Card>
        <Card title="ログイン失敗メンバー">
          <Table
            columns={memberColumns}
            dataSource={applications?.loginFailedMembers}
            locale={{ emptyText: 'ログインに失敗したメンバーがありません' }}
            loading={loading}
          />
        </Card>
      </div>
    </>
  )
}

export default StatusCheckPage
