import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Button, Space, Typography, Timeline,
  Table, message, Tabs, Statistic, Row, Col, Alert, Modal, Form,
  Input, InputNumber
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, CameraOutlined,
  ToolOutlined, AuditOutlined, ClockCircleOutlined,
  DollarOutlined, CheckOutlined
} from '@ant-design/icons';
import { claimApi } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TabPane } = Tabs;

const statusColors = {
  pending_survey: 'default',
  surveying: 'processing',
  pending_assess: 'warning',
  assessing: 'processing',
  pending_review: 'warning',
  reviewing: 'processing',
  review_rejected: 'error',
  pending_pay: 'success',
  completed: 'success',
  closed: 'default'
};

function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [payoutModalVisible, setPayoutModalVisible] = useState(false);
  const [payoutForm] = Form.useForm();
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);

  useEffect(() => {
    loadReportDetail();
  }, [id]);

  const loadReportDetail = async () => {
    setLoading(true);
    try {
      const data = await claimApi.getReportById(id);
      setReport(data);
    } catch (error) {
      message.error('加载案件详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayout = async (values) => {
    setPayoutLoading(true);
    try {
      await claimApi.savePayoutSuggestion(id, values.suggestion, values.amount, '理赔员');
      message.success('赔付建议保存成功');
      setPayoutModalVisible(false);
      payoutForm.resetFields();
      loadReportDetail();
    } catch (error) {
      message.error('保存赔付建议失败: ' + error.message);
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleComplete = async () => {
    Modal.confirm({
      title: '确认结案',
      content: '确认该案件已赔付完成，要结案吗？',
      okText: '确认结案',
      cancelText: '取消',
      onOk: async () => {
        setCompleteLoading(true);
        try {
          await claimApi.completeReport(id, '理赔员');
          message.success('案件已结案');
          loadReportDetail();
        } catch (error) {
          message.error('结案失败: ' + error.message);
        } finally {
          setCompleteLoading(false);
        }
      }
    });
  };

  const photoColumns = [
    { title: '照片类型', dataIndex: 'photo_type', key: 'type', width: 120,
      render: (v) => {
        const types = { scene: '现场照片', damage: '损失部位', vehicle: '车辆全景', other: '其他' };
        return types[v] || v;
      }
    },
    { title: '损失部位', dataIndex: 'damage_part', key: 'part', width: 120 },
    { title: '文件名', dataIndex: 'file_name', key: 'name' },
    { title: '上传人', dataIndex: 'upload_by', key: 'uploader', width: 100 },
    { title: '上传时间', dataIndex: 'upload_time', key: 'time', width: 160,
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm') },
    { title: '描述', dataIndex: 'description', key: 'desc' }
  ];

  const damageColumns = [
    { title: '损失部位', dataIndex: 'damage_part', key: 'part', width: 120 },
    { title: '损失类型', dataIndex: 'damage_type', key: 'type', width: 100,
      render: (v) => {
        const types = { repair: '维修', replace: '更换', paint: '喷漆', other: '其他' };
        return types[v] || v;
      }
    },
    { title: '项目名称', dataIndex: 'item_name', key: 'name' },
    { title: '数量', dataIndex: 'quantity', key: 'qty', width: 80 },
    { title: '单价', dataIndex: 'unit_price', key: 'price', width: 100, render: v => v.toFixed(2) },
    { title: '工时费', dataIndex: 'labor_fee', key: 'labor', width: 100, render: v => v.toFixed(2) },
    { title: '小计', dataIndex: 'total_amount', key: 'total', width: 100, render: v => v.toFixed(2) },
    { title: '配件来源', dataIndex: 'parts_source', key: 'source', width: 120,
      render: (v) => {
        const sources = { original: '原厂配件', '副厂': '副厂配件', '拆车': '拆车件', repair: '维修工时' };
        return sources[v] || v;
      }
    },
    { title: '调整说明', dataIndex: 'adjustment_note', key: 'note', render: v => v || '-' }
  ];

  const reviewColumns = [
    { title: '定损金额', dataIndex: 'total_amount', key: 'amount', width: 120, render: v => v.toFixed(2) },
    { title: '权限阈值', dataIndex: 'threshold', key: 'threshold', width: 120, render: v => v.toFixed(2) },
    { title: '审核人', dataIndex: 'reviewer', key: 'reviewer', width: 100, render: v => v || '-' },
    { title: '复核结果', dataIndex: 'review_result', key: 'result', width: 100,
      render: (v) => {
        if (!v) return <Tag color="processing">待处理</Tag>;
        return v === 'approve' ? <Tag color="success">通过</Tag> : <Tag color="error">退回</Tag>;
      }
    },
    { title: '复核意见', dataIndex: 'review_opinion', key: 'opinion' },
    { title: '复核时间', dataIndex: 'review_time', key: 'time', width: 160,
      render: (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-' }
  ];

  if (!report) {
    return <div style={{ padding: 24 }}>加载中...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
            返回列表
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            案件详情 - {report.report_no}
          </Title>
          <Tag color={statusColors[report.status]} style={{ fontSize: 14, padding: '4px 12px' }}>
            {report.status_name}
          </Tag>
        </Space>
      </div>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="案件基本信息" size="small">
          <Descriptions column={3} size="small" bordered>
            <Descriptions.Item label="报案号">{report.report_no}</Descriptions.Item>
            <Descriptions.Item label="报案人">{report.reporter_name}</Descriptions.Item>
            <Descriptions.Item label="联系电话">{report.reporter_phone}</Descriptions.Item>
            <Descriptions.Item label="车牌号">{report.vehicle_plate}</Descriptions.Item>
            <Descriptions.Item label="车辆品牌">{report.vehicle_brand}</Descriptions.Item>
            <Descriptions.Item label="车辆型号">{report.vehicle_model}</Descriptions.Item>
            <Descriptions.Item label="事故时间">
              {dayjs(report.accident_time).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="事故地点" span={2}>
              {report.accident_location}
            </Descriptions.Item>
            <Descriptions.Item label="事故描述" span={3}>
              {report.accident_description}
            </Descriptions.Item>
          </Descriptions>

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={6}>
              <Statistic title="定损总金额" value={report.total_amount} precision={2} suffix="元" />
            </Col>
            <Col span={6}>
              <Statistic 
                title="赔付建议金额" 
                value={report.payout_amount || 0} 
                precision={2} 
                suffix="元"
                valueStyle={{ color: report.payout_amount ? '#3f8600' : '#999' }}
              />
            </Col>
            <Col span={6}>
              <Statistic title="照片数量" value={report.photos.length} suffix="张" />
            </Col>
            <Col span={6}>
              <Statistic title="损失项目" value={report.damage_items.length} suffix="项" />
            </Col>
            <Col span={6}>
              <Statistic title="复核次数" value={report.reviews.length} suffix="次" />
            </Col>
          </Row>
        </Card>

        <Card
          title="快捷操作"
          size="small"
          extra={
            <Space>
              {['pending_survey', 'surveying'].includes(report.status) && (
                <Button
                  type="primary"
                  icon={<CameraOutlined />}
                  onClick={() => navigate(`/survey/${report.id}`)}
                >
                  去查勘
                </Button>
              )}
              {['pending_assess', 'assessing', 'review_rejected'].includes(report.status) && (
                <Button
                  type="primary"
                  icon={<ToolOutlined />}
                  onClick={() => navigate(`/assessment/${report.id}`)}
                >
                  去定损
                </Button>
              )}
              {['pending_review', 'reviewing'].includes(report.status) && (
                <Button
                  type="primary"
                  icon={<AuditOutlined />}
                  onClick={() => navigate('/review')}
                >
                  去复核
                </Button>
              )}
              {['pending_pay', 'assessing', 'reviewing'].includes(report.status) && (
                <Button
                  icon={<DollarOutlined />}
                  onClick={() => {
                    payoutForm.setFieldsValue({
                      suggestion: report.payout_suggestion || '',
                      amount: report.payout_amount || report.total_amount
                    });
                    setPayoutModalVisible(true);
                  }}
                >
                  赔付建议
                </Button>
              )}
              {report.status === 'pending_pay' && (
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={completeLoading}
                  onClick={handleComplete}
                >
                  结案
                </Button>
              )}
            </Space>
          }
        />

        <Card size="small">
          <Tabs defaultActiveKey="timeline">
            <TabPane tab={<span><ClockCircleOutlined />案件时间线</span>} key="timeline">
              <Timeline
                mode="left"
                items={report.status_history.map((h, index) => ({
                  color: index === report.status_history.length - 1 ? 'blue' : 'gray',
                  children: (
                    <div className="timeline-item-content">
                      <div>
                        <span className="timeline-item-operator">{h.operator}</span>
                        <span style={{ margin: '0 8px' }}>
                          {h.from_status_name ? `${h.from_status_name} → ` : ''}
                          <Tag color={statusColors[h.to_status] || 'default'}>
                            {h.to_status_name}
                          </Tag>
                        </span>
                        <span className="timeline-item-time">
                          {dayjs(h.operation_time).format('YYYY-MM-DD HH:mm:ss')}
                        </span>
                      </div>
                      {h.remark && (
                        <div className="timeline-item-remark">{h.remark}</div>
                      )}
                    </div>
                  )
                }))}
              />
            </TabPane>

            <TabPane tab={<span><CameraOutlined />查勘照片 ({report.photos.length})</span>} key="photos">
              {report.photos.length === 0 ? (
                <Alert message="暂无查勘照片" type="info" />
              ) : (
                <Table
                  columns={photoColumns}
                  dataSource={report.photos}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              )}
            </TabPane>

            <TabPane tab={<span><ToolOutlined />损失明细 ({report.damage_items.length})</span>} key="damage">
              {report.damage_items.length === 0 ? (
                <Alert message="暂无定损数据" type="info" />
              ) : (
                <Table
                  columns={damageColumns}
                  dataSource={report.damage_items}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  footer={() => (
                    <div style={{ textAlign: 'right', paddingRight: 24 }}>
                      <strong>合计：¥ {report.total_amount.toFixed(2)}</strong>
                    </div>
                  )}
                />
              )}
            </TabPane>

            <TabPane tab={<span><AuditOutlined />复核记录 ({report.reviews.length})</span>} key="review">
              {report.reviews.length === 0 ? (
                <Alert message="暂无复核记录" type="info" />
              ) : (
                <Table
                  columns={reviewColumns}
                  dataSource={report.reviews}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              )}
            </TabPane>

            <TabPane tab={<span><DollarOutlined />赔付建议</span>} key="payout">
              {!report.payout_suggestion ? (
                <Alert
                  message="暂无赔付建议"
                  description={
                    report.status === 'pending_pay' || report.status === 'reviewing' || report.status === 'assessing'
                      ? '点击上方"赔付建议"按钮录入赔付建议'
                      : '案件需进入定损或复核状态后可录入赔付建议'
                  }
                  type="info"
                  showIcon
                />
              ) : (
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="赔付建议">
                    {report.payout_suggestion}
                  </Descriptions.Item>
                  <Descriptions.Item label="赔付金额">
                    <span style={{ fontSize: 18, fontWeight: 'bold', color: '#3f8600' }}>
                      ¥ {report.payout_amount.toFixed(2)}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="操作人">{report.payout_operator || '-'}</Descriptions.Item>
                  <Descriptions.Item label="操作时间">
                    {report.payout_time ? dayjs(report.payout_time).format('YYYY-MM-DD HH:mm') : '-'}
                  </Descriptions.Item>
                </Descriptions>
              )}
            </TabPane>
          </Tabs>
        </Card>
      </Space>

      <Modal
        title="录入赔付建议"
        open={payoutModalVisible}
        onCancel={() => {
          setPayoutModalVisible(false);
          payoutForm.resetFields();
        }}
        footer={null}
        destroyOnClose
        width={500}
      >
        <Form form={payoutForm} layout="vertical" onFinish={handleSavePayout}>
          <Form.Item
            name="amount"
            label="赔付金额（元）"
            rules={[
              { required: true, message: '请输入赔付金额' },
              { type: 'number', min: 0, message: '赔付金额不能小于0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入赔付金额"
              min={0}
              precision={2}
              addonBefore="¥"
            />
          </Form.Item>
          <Form.Item
            name="suggestion"
            label="赔付建议说明"
            rules={[{ required: true, message: '请输入赔付建议说明' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="请详细说明赔付建议的理由和依据"
              showCount
              maxLength={500}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={payoutLoading}>
                保存赔付建议
              </Button>
              <Button onClick={() => {
                setPayoutModalVisible(false);
                payoutForm.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default ReportDetail;
