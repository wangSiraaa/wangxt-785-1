import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Table, Button, Form, Input, Select, Tag, 
  Typography, message, Space, Modal, Descriptions, Alert
} from 'antd';
import { PlusOutlined, CameraOutlined, CheckOutlined } from '@ant-design/icons';
import { claimApi } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const photoTypes = [
  { value: 'scene', label: '现场照片' },
  { value: 'damage', label: '损失部位照片' },
  { value: 'vehicle', label: '车辆全景照片' },
  { value: 'other', label: '其他照片' }
];

const damageParts = [
  '前保险杠', '后保险杠', '左前大灯', '右前大灯', '左后视镜', '右后视镜',
  '引擎盖', '后备箱盖', '左前车门', '右前车门', '左后车门', '右后车门',
  '前挡风玻璃', '后挡风玻璃', '左前翼子板', '右前翼子板', '车顶', '底盘',
  '水箱框架', '冷凝器', '散热器', '其他'
];

function Survey() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(id || null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoForm] = Form.useForm();

  useEffect(() => {
    if (selectedReportId) {
      loadReportDetail(selectedReportId);
    } else {
      loadPendingSurveyReports();
    }
  }, [selectedReportId]);

  const loadPendingSurveyReports = async () => {
    setLoading(true);
    try {
      const data = await claimApi.getReports({ status: 'pending_survey' });
      setReports(data);
    } catch (error) {
      message.error('加载待查勘案件失败');
    } finally {
      setLoading(false);
    }
  };

  const loadReportDetail = async (reportId) => {
    setLoading(true);
    try {
      const data = await claimApi.getReportById(reportId);
      setReport(data);
    } catch (error) {
      message.error('加载案件详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReport = (reportId) => {
    setSelectedReportId(reportId);
    navigate(`/survey/${reportId}`);
  };

  const handleAddPhoto = async (values) => {
    try {
      await claimApi.uploadPhoto(selectedReportId, {
        ...values,
        upload_by: '查勘员张三',
        file_path: `/uploads/${Date.now()}_${values.file_name}`
      });
      message.success('照片上传成功');
      setPhotoModalVisible(false);
      photoForm.resetFields();
      loadReportDetail(selectedReportId);
    } catch (error) {
      message.error('照片上传失败: ' + error.message);
    }
  };

  const handleSubmitSurvey = async () => {
    if (!report || report.photos.length === 0) {
      message.error('请先上传现场照片');
      return;
    }
    setSubmitLoading(true);
    try {
      await claimApi.submitSurvey(selectedReportId, '查勘员张三');
      message.success('查勘提交成功');
      navigate('/assessment/' + selectedReportId);
    } catch (error) {
      message.error('提交失败: ' + error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const photoColumns = [
    { title: '照片类型', dataIndex: 'photo_type', key: 'photo_type', 
      render: (type) => photoTypes.find(p => p.value === type)?.label || type },
    { title: '损失部位', dataIndex: 'damage_part', key: 'damage_part' },
    { title: '文件名', dataIndex: 'file_name', key: 'file_name' },
    { title: '上传人', dataIndex: 'upload_by', key: 'upload_by' },
    { title: '上传时间', dataIndex: 'upload_time', key: 'upload_time',
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm') },
    { title: '描述', dataIndex: 'description', key: 'description' }
  ];

  if (!selectedReportId) {
    return (
      <div>
        <div className="page-header">
          <Title level={3}>查勘管理</Title>
        </div>
        <Card>
          <Title level={5}>选择待查勘案件</Title>
          <Table
            columns={[
              { title: '报案号', dataIndex: 'report_no', key: 'report_no' },
              { title: '报案人', dataIndex: 'reporter_name', key: 'reporter_name' },
              { title: '车牌号', dataIndex: 'vehicle_plate', key: 'vehicle_plate' },
              { title: '事故地点', dataIndex: 'accident_location', key: 'accident_location' },
              { title: '报案时间', dataIndex: 'created_at', key: 'created_at',
                render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm') },
              { title: '操作', key: 'action',
                render: (_, record) => (
                  <Button type="link" onClick={() => handleSelectReport(record.id)}>
                    开始查勘
                  </Button>
                )
              }
            ]}
            dataSource={reports}
            rowKey="id"
            loading={loading}
            pagination={false}
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <Title level={3}>查勘管理 - {report?.report_no}</Title>
      </div>

      {report && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card title="案件基本信息">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="报案号">{report.report_no}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color="processing">{report.status_name}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="报案人">{report.reporter_name}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{report.reporter_phone}</Descriptions.Item>
              <Descriptions.Item label="车牌号">{report.vehicle_plate}</Descriptions.Item>
              <Descriptions.Item label="车辆">{report.vehicle_brand} {report.vehicle_model}</Descriptions.Item>
              <Descriptions.Item label="事故时间" span={2}>
                {dayjs(report.accident_time).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="事故地点" span={2}>
                {report.accident_location}
              </Descriptions.Item>
              <Descriptions.Item label="事故描述" span={2}>
                {report.accident_description}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card 
            title="现场照片" 
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setPhotoModalVisible(true)}>
                上传照片
              </Button>
            }
          >
            {report.photos.length === 0 && (
              <Alert
                message="请上传现场照片后再提交查勘"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            <Table
              columns={photoColumns}
              dataSource={report.photos}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>

          <Card>
            <Space>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={submitLoading}
                disabled={report.photos.length === 0}
                onClick={handleSubmitSurvey}
              >
                提交查勘，进入定损
              </Button>
              <Button onClick={() => navigate('/')}>返回列表</Button>
            </Space>
          </Card>
        </Space>
      )}

      <Modal
        title="上传查勘照片"
        open={photoModalVisible}
        onCancel={() => setPhotoModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={photoForm} layout="vertical" onFinish={handleAddPhoto}>
          <Form.Item
            name="photo_type"
            label="照片类型"
            rules={[{ required: true, message: '请选择照片类型' }]}
          >
            <Select placeholder="请选择">
              {photoTypes.map(p => (
                <Option key={p.value} value={p.value}>{p.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="damage_part"
            label="损失部位"
            rules={[{ required: true, message: '请选择损失部位' }]}
          >
            <Select placeholder="请选择">
              {damageParts.map(p => (
                <Option key={p} value={p}>{p}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="file_name"
            label="文件名"
            rules={[{ required: true, message: '请输入文件名' }]}
          >
            <Input placeholder="例如：现场照片1.jpg" />
          </Form.Item>
          <Form.Item name="description" label="照片描述">
            <TextArea rows={3} placeholder="请输入照片描述" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">确定上传</Button>
              <Button onClick={() => setPhotoModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Survey;
