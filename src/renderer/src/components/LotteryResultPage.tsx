import { Card, Button, message, Progress, Space, Typography } from 'antd'
import type { Profile } from '../../../common/types'
import { useState, useEffect } from 'react'

interface Props {
  profile: Profile | null
}

interface ProgressInfo {
  current: number
  total: number
  message: string
}

export default function LotteryResultPage({ profile }: Props): React.JSX.Element {
  const [progress, setProgress] = useState<ProgressInfo | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

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
      const success = await window.api.confirmLotteryResult(profile.id)
      console.log(success)
      if (success) {
        message.success('抽選結果を確定しました')
      } else {
        message.error('抽選結果の確定に失敗しました')
      }
      setIsProcessing(false)
    } catch (err) {
      message.error(`エラーが発生しました: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <Card title="抽選結果確定" bordered={false}>
      <p>抽選結果を確定するには以下のボタンをクリックしてください</p>
      {profile && <p>現在のプロファイル: {profile.name}</p>}
      <Button 
        type="primary" 
        onClick={handleConfirm}
        loading={isProcessing}
        disabled={isProcessing}
      >
        抽選結果を確定
      </Button>

      {progress && (
        <Space direction="vertical" style={{ marginTop: 16, width: '100%' }}>
          <Progress percent={
            Math.floor((progress.current / progress.total) * 100)
} status="active" />
          <Typography.Text>
            {progress.message} ({progress.current}/{progress.total})
          </Typography.Text>
        </Space>
      )}
    </Card>
  )
}
