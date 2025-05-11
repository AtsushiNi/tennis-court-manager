import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'

interface Member {
  key: string
  name: string
  age: number
  position: string
  joinDate: string
}

const MembersPage = (): React.JSX.Element => {
  const columns: ColumnsType<Member> = [
    {
      title: '名前',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '年齢',
      dataIndex: 'age',
      key: 'age'
    },
    {
      title: 'ポジション',
      dataIndex: 'position',
      key: 'position'
    },
    {
      title: '入部日',
      dataIndex: 'joinDate',
      key: 'joinDate'
    }
  ]

  const data: Member[] = [
    {
      key: '1',
      name: '山田 太郎',
      age: 25,
      position: 'シングルス',
      joinDate: '2023/04/01'
    },
    {
      key: '2',
      name: '佐藤 花子',
      age: 22,
      position: 'ダブルス',
      joinDate: '2023/05/15'
    },
    {
      key: '3',
      name: '鈴木 一郎',
      age: 28,
      position: 'シングルス',
      joinDate: '2022/10/10'
    }
  ]

  return (
    <div>
      <h1 style={{ marginBottom: '20px' }}>テニス部 メンバー一覧</h1>
      <Table columns={columns} dataSource={data} />
    </div>
  )
}

export default MembersPage
