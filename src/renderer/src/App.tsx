import 'antd/dist/reset.css'
import { Layout, Menu, App, Dropdown, Button, Form, Input, Modal } from 'antd'
import {
  UserOutlined,
  PlusOutlined,
  TeamOutlined,
  DownOutlined,
  DeleteOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import { useEffect, useState } from 'react'
import type { Profile } from '../../common/types'
import MembersPage from './components/MembersPage'
import BulkLotteryApplicationPage from './components/BulkLotteryApplicationPage'
import IndividualLotteryApplicationPage from './components/IndividualLotteryApplicationPage'
import StatusCheckPage from './components/StatusCheckPage'
import LotteryResultPage from './components/LotteryResultPage'

const { Sider, Content } = Layout

function AppComponent(): React.JSX.Element {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [currentPage, setCurrentPage] = useState<
    'members' | 'bulk-lottery' | 'individual-lottery' | 'status' | 'result'
  >('members')
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null)
  const [profileForm] = Form.useForm()

  // プロファイル一覧を読み込む
  useEffect(() => {
    const loadProfiles = async (): Promise<void> => {
      try {
        const loadedProfiles = await window.api.loadProfiles()
        setProfiles(loadedProfiles)
        if (loadedProfiles.length > 0) {
          setCurrentProfile(loadedProfiles[0])
        }
      } catch (err) {
        console.error('Failed to load profiles:', err)
      }
    }
    loadProfiles()
  }, [])

  const handleAddProfile = (): void => {
    profileForm.validateFields().then((values) => {
      const newProfile: Profile = {
        id: Date.now().toString(),
        name: values.name
      }
      const updatedProfiles = [...profiles, newProfile]
      setProfiles(updatedProfiles)
      setCurrentProfile(newProfile)
      window.api.saveProfiles(updatedProfiles)
      setIsProfileModalOpen(false)
      profileForm.resetFields()
    })
  }

  // プロファイルの削除
  const handleDeleteProfile = async (): Promise<void> => {
    if (!deletingProfileId) {
      return
    }

    const success = await window.api.deleteProfile(deletingProfileId)
    if (success) {
      const updatedProfiles = profiles.filter((p) => p.id !== deletingProfileId)
      setProfiles(updatedProfiles)
      if (currentProfile?.id === deletingProfileId) {
        setCurrentProfile(updatedProfiles[0] || null)
      }
    }

    setIsDeleteModalOpen(false)
    setDeletingProfileId(null)
  }

  const profileMenu = (
    <Menu>
      {profiles.map((profile) => (
        <Menu.Item key={profile.id} onClick={() => setCurrentProfile(profile)}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <TeamOutlined style={{ marginRight: 8 }} />
              <span>{profile.name}</span>
            </div>
            <Button
              danger
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => {
                setDeletingProfileId(profile.id)
                setIsDeleteModalOpen(true)
              }}
            />
          </div>
        </Menu.Item>
      ))}
      <Menu.Divider />
      <Menu.Item
        key="add-profile"
        icon={<PlusOutlined />}
        onClick={() => setIsProfileModalOpen(true)}
      >
        プロファイルを追加
      </Menu.Item>
    </Menu>
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div
          className="logo"
          style={{
            height: '32px',
            margin: '16px',
            background: 'rgba(255, 255, 255, 0.2)'
          }}
        />
        <div style={{ padding: '16px', borderBottom: '1px solid #434343' }}>
          <Dropdown overlay={profileMenu} placement="bottomLeft" trigger={['click']}>
            <Button
              type="primary"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <TeamOutlined style={{ marginRight: 8 }} />
                <span>{currentProfile?.name || 'プロファイルを選択'}</span>
              </div>
              <DownOutlined />
            </Button>
          </Dropdown>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[currentPage]}
          style={{ padding: 8 }}
          onSelect={({ key }) =>
            setCurrentPage(key as 'members' | 'bulk-lottery' | 'individual-lottery' | 'status' | 'result')
          }
        >
          <Menu.Item key="members" icon={<UserOutlined />}>
            カード一覧
          </Menu.Item>
          <Menu.SubMenu key="lottery" icon={<PlusOutlined />} title="抽選申込み">
            <Menu.Item key="bulk-lottery">一括申込み</Menu.Item>
            <Menu.Item key="individual-lottery">個別申込み</Menu.Item>
          </Menu.SubMenu>
          <Menu.Item key="status" icon={<TeamOutlined />}>
            状況確認
          </Menu.Item>
          <Menu.Item key="result" icon={<CheckCircleOutlined />}>
            抽選結果確定
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Content style={{ margin: '16px' }}>
          {currentPage === 'members' && <MembersPage profile={currentProfile} />}
          {currentPage === 'bulk-lottery' && (
            <BulkLotteryApplicationPage profile={currentProfile} />
          )}
          {currentPage === 'individual-lottery' && (
            <IndividualLotteryApplicationPage profile={currentProfile} />
          )}
          {currentPage === 'status' && <StatusCheckPage profile={currentProfile} />}
          {currentPage === 'result' && <LotteryResultPage profile={currentProfile} />}
        </Content>
      </Layout>
      <Modal
        title="新しいプロファイルを追加"
        open={isProfileModalOpen}
        onOk={handleAddProfile}
        onCancel={() => setIsProfileModalOpen(false)}
      >
        <Form form={profileForm} layout="vertical">
          <Form.Item
            name="name"
            label="プロファイル名"
            rules={[{ required: true, message: 'プロファイル名を入力してください' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="プロファイルを削除しますか？"
        open={isDeleteModalOpen}
        onOk={handleDeleteProfile}
        onCancel={() => {
          setIsDeleteModalOpen(false)
          setDeletingProfileId(null)
        }}
        okText="削除"
        cancelText="キャンセル"
        okButtonProps={{ danger: true }}
      >
        <p>
          この操作は元に戻せません。プロファイルと関連するすべてのメンバーデータが削除されます。
        </p>
      </Modal>
    </Layout>
  )
}

export default function AppWrapper(): React.JSX.Element {
  return (
    <App>
      <AppComponent />
    </App>
  )
}
