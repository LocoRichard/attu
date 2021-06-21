import { makeStyles, Theme, Typography } from '@material-ui/core';
import { FC, useCallback, useEffect, useState } from 'react';
import MilvusGrid from '../../components/grid';
import { ColDefinitionsType } from '../../components/grid/Types';
import { useTranslation } from 'react-i18next';
import { usePaginationHook } from '../../hooks/Pagination';
import icons from '../../components/icons/Icons';
import CustomToolTip from '../../components/customToolTip/CustomToolTip';
import { FieldHttp } from '../../http/Field';
import { FieldView } from './Types';
import IndexTypeElement from './IndexTypeElement';

const useStyles = makeStyles((theme: Theme) => ({
  wrapper: {
    height: '100%',
  },
  icon: {
    fontSize: '20px',
    marginLeft: theme.spacing(0.5),
  },
  nameWrapper: {
    display: 'flex',
    alignItems: 'center',

    '& .key': {
      width: '16px',
      height: '16px',
      marginLeft: theme.spacing(0.5),
    },
  },

  param: {
    padding: theme.spacing(0.5),

    marginRight: theme.spacing(2),

    '& .key': {
      color: '#82838e',
      display: 'inline-block',
      marginRight: theme.spacing(0.5),
    },

    '& .value': {
      color: '#010e29',
    },
  },
}));

const Structure: FC<{
  collectionName: string;
}> = ({ collectionName }) => {
  const classes = useStyles();
  const { t: collectionTrans } = useTranslation('collection');
  const { t: indexTrans } = useTranslation('index');
  const InfoIcon = icons.info;

  const [fields, setFields] = useState<FieldView[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const {
    pageSize,
    currentPage,
    handleCurrentPage,
    total,
    data: structureList,
  } = usePaginationHook(fields);

  const fetchFields = useCallback(
    async (collectionName: string) => {
      const KeyIcon = icons.key;

      try {
        const list = await FieldHttp.getStructureListWithIndex(collectionName);
        const fields: FieldView[] = list.map(f =>
          Object.assign(f, {
            _fieldNameElement: (
              <div className={classes.nameWrapper}>
                {f._fieldName}
                {f.is_primary_key && <KeyIcon classes={{ root: 'key' }} />}
              </div>
            ),
            _indexParamElement: (
              <>
                {f._indexParameterPairs?.length > 0 ? (
                  f._indexParameterPairs.map(p => (
                    <span key={p.key} className={classes.param}>
                      <Typography variant="caption" className="key">
                        {`${p.key}:`}
                      </Typography>
                      <Typography variant="caption" className="value">
                        {p.value}
                      </Typography>
                    </span>
                  ))
                ) : (
                  <>--</>
                )}
              </>
            ),
            _indexTypeElement: (
              <IndexTypeElement data={f} collectionName={collectionName} />
            ),
          })
        );

        setFields(fields);
        setLoading(false);
      } catch (err) {
        setLoading(false);
        throw err;
      }
    },
    [classes.nameWrapper, classes.param]
  );

  useEffect(() => {
    fetchFields(collectionName);
  }, [collectionName, fetchFields]);

  const colDefinitions: ColDefinitionsType[] = [
    {
      id: '_fieldNameElement',
      align: 'left',
      disablePadding: true,
      label: collectionTrans('fieldName'),
    },
    {
      id: '_fieldType',
      align: 'left',
      disablePadding: false,
      label: collectionTrans('fieldType'),
    },
    {
      id: '_dimension',
      align: 'left',
      disablePadding: false,
      label: (
        <span className="flex-center">
          {collectionTrans('dimension')}
          <CustomToolTip title={collectionTrans('dimensionTooltip')}>
            <InfoIcon classes={{ root: classes.icon }} />
          </CustomToolTip>
        </span>
      ),
    },
    {
      id: '_indexTypeElement',
      align: 'left',
      disablePadding: true,
      label: indexTrans('type'),
    },
    {
      id: '_indexParamElement',
      align: 'left',
      disablePadding: false,
      label: indexTrans('param'),
    },
  ];

  const handlePageChange = (e: any, page: number) => {
    handleCurrentPage(page);
  };

  return (
    <section className={classes.wrapper}>
      <MilvusGrid
        toolbarConfigs={[]}
        colDefinitions={colDefinitions}
        rows={structureList}
        rowCount={total}
        primaryKey="_fieldId"
        openCheckBox={false}
        showHoverStyle={false}
        page={currentPage}
        onChangePage={handlePageChange}
        rowsPerPage={pageSize}
        isLoading={loading}
      />
    </section>
  );
};

export default Structure;
