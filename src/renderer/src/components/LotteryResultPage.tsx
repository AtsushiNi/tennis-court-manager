import { Card, Button, message } from 'antd'
import type { Profile } from '../../../common/types'

interface Props {
  profile: Profile | null
}

export default function LotteryResultPage({ profile }: Props): React.JSX.Element {
  const handleConfirm = async (): Promise<void> => {
    if (!profile) {
      message.error('プロファイルが選択されていません')
      return
    }

    try {
      const success = await window.api.confirmLotteryResult(profile.id)
      if (success) {
        message.success('抽選結果を確定しました')
      } else {
        message.error('抽選結果の確定に失敗しました')
      }
    } catch (err) {
      message.error(`エラーが発生しました: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <Card title="抽選結果確定" bordered={false}>
      <p>抽選結果を確定するには以下のボタンをクリックしてください</p>
      {profile && <p>現在のプロファイル: {profile.name}</p>}
      <Button type="primary" onClick={handleConfirm}>
        抽選結果を確定
      </Button>
    </Card>
  )
}
