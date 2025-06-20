USE SistemaVacunacion;
GO

-- 1. Centros_Vacunacion
CREATE OR ALTER PROCEDURE sp_CrearCentroVacunacion
    @nombre_centro NVARCHAR(200),
    @nombre_corto NVARCHAR(50) = NULL,
    @direccion NVARCHAR(500) = NULL,
    @latitud DECIMAL(9,6) = NULL,
    @longitud DECIMAL(9,6) = NULL,
    @telefono NVARCHAR(20) = NULL,
    @director NVARCHAR(200) = NULL,
    @sitio_web NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @id_centro UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Centros_Vacunacion (
            id_centro, nombre_centro, nombre_corto, direccion, latitud, longitud,
            telefono, director, sitio_web
        )
        VALUES (
            @id_centro, @nombre_centro, @nombre_corto, @direccion, @latitud, @longitud,
            @telefono, @director, @sitio_web
        );
        SELECT @id_centro AS id_centro;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ActualizarCentroVacunacion
    @id_centro UNIQUEIDENTIFIER,
    @nombre_centro NVARCHAR(200),
    @nombre_corto NVARCHAR(50) = NULL,
    @direccion NVARCHAR(500) = NULL,
    @latitud DECIMAL(9,6) = NULL,
    @longitud DECIMAL(9,6) = NULL,
    @telefono NVARCHAR(20) = NULL,
    @director NVARCHAR(200) = NULL,
    @sitio_web NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Centros_Vacunacion
        SET
            nombre_centro = @nombre_centro,
            nombre_corto = @nombre_corto,
            direccion = @direccion,
            latitud = @latitud,
            longitud = @longitud,
            telefono = @telefono,
            director = @director,
            sitio_web = @sitio_web
        WHERE id_centro = @id_centro;
        IF @@ROWCOUNT = 0
            RAISERROR ('Centro no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_EliminarCentroVacunacion
    @id_centro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (
            SELECT 1 FROM Niños WHERE id_centro_salud = @id_centro
            UNION
            SELECT 1 FROM Lotes_Vacunas WHERE id_centro = @id_centro
            UNION
            SELECT 1 FROM Personal_Salud WHERE id_centro = @id_centro
            UNION
            SELECT 1 FROM Usuarios WHERE id_centro = @id_centro
            UNION
            SELECT 1 FROM Campana_Centro WHERE id_centro = @id_centro
            UNION
            SELECT 1 FROM Citas WHERE id_centro = @id_centro
            UNION
            SELECT 1 FROM Historial_Vacunacion WHERE id_centro = @id_centro
            UNION
            SELECT 1 FROM Inventario_Suministros WHERE id_centro = @id_centro
        )
            RAISERROR ('No se puede eliminar el centro debido a registros dependientes', 16, 1);

        UPDATE Centros_Vacunacion 
        SET estado = 'Inactivo'
        WHERE id_centro = @id_centro;
        IF @@ROWCOUNT = 0
            RAISERROR ('Centro no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ListarCentros
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Centros_Vacunacion;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerCentroPorId
    @id_centro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Centros_Vacunacion WHERE id_centro = @id_centro;
END;
GO

-- 2. Vacunas
CREATE OR ALTER PROCEDURE sp_CrearVacuna
    @nombre NVARCHAR(100),
    @fabricante NVARCHAR(100),
    @tipo NVARCHAR(50),
    @dosis_requeridas INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @id_vacuna UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Vacunas (
            id_vacuna, nombre, fabricante, tipo, dosis_requeridas
        )
        VALUES (
            @id_vacuna, @nombre, @fabricante, @tipo, @dosis_requeridas
        );
        SELECT @id_vacuna AS id_vacuna;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ActualizarVacuna
    @id_vacuna UNIQUEIDENTIFIER,
    @nombre NVARCHAR(100),
    @fabricante NVARCHAR(100),
    @tipo NVARCHAR(50),
    @dosis_requeridas INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Vacunas
        SET
            nombre = @nombre,
            fabricante = @fabricante,
            tipo = @tipo,
            dosis_requeridas = @dosis_requeridas
        WHERE id_vacuna = @id_vacuna;
        IF @@ROWCOUNT = 0
            RAISERROR ('Vacuna no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_EliminarVacuna
    @id_vacuna UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (
            SELECT 1 FROM Lotes_Vacunas WHERE id_vacuna = @id_vacuna
            UNION
            SELECT 1 FROM Campanas_Vacunacion WHERE id_vacuna = @id_vacuna
            UNION
            SELECT 1 FROM Esquema_Vacunacion WHERE id_vacuna = @id_vacuna
        )
            RAISERROR ('No se puede eliminar la vacuna debido a registros dependientes', 16, 1);

        DELETE FROM Vacunas WHERE id_vacuna = @id_vacuna;
        IF @@ROWCOUNT = 0
            RAISERROR ('Vacuna no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ListarVacunas
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Vacunas;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerVacunaPorId
    @id_vacuna UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Vacunas WHERE id_vacuna = @id_vacuna;
END;
GO

-- 3. Niños
CREATE OR ALTER PROCEDURE sp_CrearNino
    @nombre_completo NVARCHAR(200),
    @identificacion NVARCHAR(20),
    @nacionalidad UNIQUEIDENTIFIER,
    @pais_nacimiento UNIQUEIDENTIFIER,
    @fecha_nacimiento DATE,
    @genero CHAR(1),
    @direccion_residencia NVARCHAR(500) = NULL,
    @latitud DECIMAL(9,6) = NULL,
    @longitud DECIMAL(9,6) = NULL,
    @id_centro_salud UNIQUEIDENTIFIER = NULL,
    @contacto_principal NVARCHAR(50) = NULL,
    @id_salud_nacional NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Paises WHERE id_pais = @nacionalidad)
            RAISERROR ('Nacionalidad no válida', 16, 1);
        IF NOT EXISTS (SELECT 1 FROM Paises WHERE id_pais = @pais_nacimiento)
            RAISERROR ('País de nacimiento no válido', 16, 1);

        DECLARE @id_niño UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Niños (
            id_niño, nombre_completo, identificacion, nacionalidad, pais_nacimiento, fecha_nacimiento,
            genero, direccion_residencia, latitud, longitud, id_centro_salud,
            contacto_principal, id_salud_nacional
        )
        VALUES (
            @id_niño, @nombre_completo, @identificacion, @nacionalidad, @pais_nacimiento, @fecha_nacimiento,
            @genero, @direccion_residencia, @latitud, @longitud, @id_centro_salud,
            @contacto_principal, @id_salud_nacional
        );
        SELECT @id_niño AS id_niño;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ActualizarNino
    @id_niño UNIQUEIDENTIFIER,
    @nombre_completo NVARCHAR(200),
    @identificacion NVARCHAR(20),
    @nacionalidad UNIQUEIDENTIFIER,
    @pais_nacimiento UNIQUEIDENTIFIER,
    @fecha_nacimiento DATE,
    @genero CHAR(1),
    @direccion_residencia NVARCHAR(500) = NULL,
    @latitud DECIMAL(9,6) = NULL,
    @longitud DECIMAL(9,6) = NULL,
    @id_centro_salud UNIQUEIDENTIFIER = NULL,
    @contacto_principal NVARCHAR(50) = NULL,
    @id_salud_nacional NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Paises WHERE id_pais = @nacionalidad)
            RAISERROR ('Nacionalidad no válida', 16, 1);
        IF NOT EXISTS (SELECT 1 FROM Paises WHERE id_pais = @pais_nacimiento)
            RAISERROR ('País de nacimiento no válido', 16, 1);

        UPDATE Niños
        SET
            nombre_completo = @nombre_completo,
            identificacion = @identificacion,
            nacionalidad = @nacionalidad,
            pais_nacimiento = @pais_nacimiento,
            fecha_nacimiento = @fecha_nacimiento,
            genero = @genero,
            direccion_residencia = @direccion_residencia,
            latitud = @latitud,
            longitud = @longitud,
            id_centro_salud = @id_centro_salud,
            contacto_principal = @contacto_principal,
            id_salud_nacional = @id_salud_nacional
        WHERE id_niño = @id_niño;
        IF @@ROWCOUNT = 0
            RAISERROR ('Niño no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_EliminarNino
    @id_niño UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (
            SELECT 1 FROM Tutores WHERE id_niño = @id_niño
            UNION
            SELECT 1 FROM Citas WHERE id_niño = @id_niño
            UNION
            SELECT 1 FROM Historial_Vacunacion WHERE id_niño = @id_niño
            UNION
            SELECT 1 FROM Alertas WHERE id_niño = @id_niño
        )
            RAISERROR ('No se puede eliminar el niño debido a registros dependientes', 16, 1);

        UPDATE Niños 
        SET estado = 'Inactivo'
        WHERE id_niño = @id_niño;
        IF @@ROWCOUNT = 0
            RAISERROR ('Niño no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ListarNinos
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Niños;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerNinoPorId
    @id_niño UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Niños WHERE id_niño = @id_niño;
END;
GO

-- 4. Tutores
CREATE OR ALTER PROCEDURE sp_CrearTutor
    @id_niño UNIQUEIDENTIFIER,
    @nombre NVARCHAR(200),
    @identificacion NVARCHAR(20) = NULL,
    @relacion NVARCHAR(50),
    @telefono NVARCHAR(20) = NULL,
    @email NVARCHAR(100) = NULL,
    @direccion NVARCHAR(500) = NULL,
    @nacionalidad UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Paises WHERE id_pais = @nacionalidad)
            RAISERROR ('Nacionalidad no válida', 16, 1);

        DECLARE @id_tutor UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Tutores (
            id_tutor, id_niño, nombre, identificacion, relacion, telefono, email, direccion, nacionalidad
        )
        VALUES (
            @id_tutor, @id_niño, @nombre, @identificacion, @relacion, @telefono, @email, @direccion, @nacionalidad
        );
        SELECT @id_tutor AS id_tutor;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ActualizarTutor
    @id_tutor UNIQUEIDENTIFIER,
    @id_niño UNIQUEIDENTIFIER,
    @nombre NVARCHAR(200),
    @identificacion NVARCHAR(20) = NULL,
    @relacion NVARCHAR(50),
    @telefono NVARCHAR(20) = NULL,
    @email NVARCHAR(100) = NULL,
    @direccion NVARCHAR(500) = NULL,
    @nacionalidad UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Paises WHERE id_pais = @nacionalidad)
            RAISERROR ('Nacionalidad no válida', 16, 1);

        UPDATE Tutores
        SET
            id_niño = @id_niño,
            nombre = @nombre,
            identificacion = @identificacion,
            relacion = @relacion,
            telefono = @telefono,
            email = @email,
            direccion = @direccion,
            nacionalidad = @nacionalidad
        WHERE id_tutor = @id_tutor;
        IF @@ROWCOUNT = 0
            RAISERROR ('Tutor no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_EliminarTutor
    @id_tutor UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Tutores WHERE id_tutor = @id_tutor;
        IF @@ROWCOUNT = 0
            RAISERROR ('Tutor no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ListarTutores
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Tutores;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerTutorPorId
    @id_tutor UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Tutores WHERE id_tutor = @id_tutor;
END;
GO

-- 5. Lotes_Vacunas
CREATE OR ALTER PROCEDURE sp_CrearLoteVacuna
    @id_vacuna UNIQUEIDENTIFIER,
    @numero_lote NVARCHAR(50),
    @cantidad_total INT,
    @cantidad_disponible INT,
    @fecha_fabricacion DATE,
    @fecha_vencimiento DATE,
    @id_centro UNIQUEIDENTIFIER,
    @condiciones_almacenamiento NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @id_lote UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Lotes_Vacunas (
            id_lote, id_vacuna, numero_lote, cantidad_total, cantidad_disponible,
            fecha_fabricacion, fecha_vencimiento, id_centro, condiciones_almacenamiento
        )
        VALUES (
            @id_lote, @id_vacuna, @numero_lote, @cantidad_total, @cantidad_disponible,
            @fecha_fabricacion, @fecha_vencimiento, @id_centro, @condiciones_almacenamiento
        );
        SELECT @id_lote AS id_lote;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ActualizarLoteVacuna
    @id_lote UNIQUEIDENTIFIER,
    @id_vacuna UNIQUEIDENTIFIER,
    @numero_lote NVARCHAR(50),
    @cantidad_total INT,
    @cantidad_disponible INT,
    @fecha_fabricacion DATE,
    @fecha_vencimiento DATE,
    @id_centro UNIQUEIDENTIFIER,
    @condiciones_almacenamiento NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Lotes_Vacunas
        SET
            id_vacuna = @id_vacuna,
            numero_lote = @numero_lote,
            cantidad_total = @cantidad_total,
            cantidad_disponible = @cantidad_disponible,
            fecha_fabricacion = @fecha_fabricacion,
            fecha_vencimiento = @fecha_vencimiento,
            id_centro = @id_centro,
            condiciones_almacenamiento = @condiciones_almacenamiento
        WHERE id_lote = @id_lote;
        IF @@ROWCOUNT = 0
            RAISERROR ('Lote no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_EliminarLoteVacuna
    @id_lote UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (
            SELECT 1 FROM Historial_Vacunacion WHERE id_lote = @id_lote
        )
            RAISERROR ('No se puede eliminar el lote debido a registros dependientes', 16, 1);

        DELETE FROM Lotes_Vacunas WHERE id_lote = @id_lote;
        IF @@ROWCOUNT = 0
            RAISERROR ('Lote no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ListarLotesVacunas
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Lotes_Vacunas;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerLoteVacunaPorId
    @id_lote UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Lotes_Vacunas WHERE id_lote = @id_lote;
END;
GO

-- 6. Personal_Salud
CREATE OR ALTER PROCEDURE sp_EliminarPersonalSalud
    @id_personal UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (
            SELECT 1 FROM Historial_Vacunacion WHERE id_personal = @id_personal
            UNION
            SELECT 1 FROM Eventos_Adversos WHERE id_personal_reportante = @id_personal
        )
            RAISERROR ('No se puede eliminar el personal debido a registros dependientes', 16, 1);

        DELETE FROM Personal_Salud WHERE id_personal = @id_personal;
        IF @@ROWCOUNT = 0
            RAISERROR ('Personal no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_CrearPersonalSalud
    @nombre_completo NVARCHAR(200),
    @identificacion NVARCHAR(20),
    @especialidad NVARCHAR(100),
    @id_centro UNIQUEIDENTIFIER,
    @telefono NVARCHAR(20) = NULL,
    @email NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @id_personal UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Personal_Salud (
            id_personal, nombre_completo, identificacion, especialidad, id_centro, telefono, email
        )
        VALUES (
            @id_personal, @nombre_completo, @identificacion, @especialidad, @id_centro, @telefono, @email
        );
        SELECT @id_personal AS id_personal;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ActualizarPersonalSalud
    @id_personal UNIQUEIDENTIFIER,
    @nombre_completo NVARCHAR(200),
    @identificacion NVARCHAR(20),
    @especialidad NVARCHAR(100),
    @id_centro UNIQUEIDENTIFIER,
    @telefono NVARCHAR(20) = NULL,
    @email NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Personal_Salud
        SET
            nombre_completo = @nombre_completo,
            identificacion = @identificacion,
            especialidad = @especialidad,
            id_centro = @id_centro,
            telefono = @telefono,
            email = @email
        WHERE id_personal = @id_personal;
        IF @@ROWCOUNT = 0
            RAISERROR ('Personal no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ListarPersonalSalud
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Personal_Salud;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerPersonalSaludPorId
    @id_personal UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Personal_Salud WHERE id_personal = @id_personal;
END;
GO

-- 7. Usuarios
CREATE OR ALTER PROCEDURE sp_EliminarUsuario
    @id_usuario UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (
            SELECT 1 FROM Auditoria WHERE id_usuario = @id_usuario
        )
            RAISERROR ('No se puede eliminar el usuario debido a registros dependientes', 16, 1);

        DELETE FROM Usuarios WHERE id_usuario = @id_usuario;
        IF @@ROWCOUNT = 0
            RAISERROR ('Usuario no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_CrearUsuario
    @username NVARCHAR(50),
    @email NVARCHAR(100),
    @password NVARCHAR(100),
    @rol NVARCHAR(50),
    @id_centro UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @id_usuario UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Usuarios (
            id_usuario, username, email, password, rol, id_centro
        )
        VALUES (
            @id_usuario, @username, @email, @password, @rol, @id_centro
        );
        SELECT @id_usuario AS id_usuario;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ActualizarUsuario
    @id_usuario UNIQUEIDENTIFIER,
    @username NVARCHAR(50),
    @email NVARCHAR(100),
    @password NVARCHAR(100),
    @rol NVARCHAR(50),
    @id_centro UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Usuarios
        SET
            username = @username,
            email = @email,
            password = @password,
            rol = @rol,
            id_centro = @id_centro
        WHERE id_usuario = @id_usuario;
        IF @@ROWCOUNT = 0
            RAISERROR ('Usuario no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ListarUsuarios
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Usuarios;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerUsuarioPorId
    @id_usuario UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Usuarios WHERE id_usuario = @id_usuario;
END;
GO

CREATE OR ALTER PROCEDURE sp_ValidarUsuario
    @username NVARCHAR(50),
    @password NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id_usuario, username, password, rol, estado
    FROM Usuarios
    WHERE username = @username AND estado = 'Activo';
END;
GO

-- 8. Campanas_Vacunacion
CREATE OR ALTER PROCEDURE sp_CrearCampanaVacunacion
    @nombre_campaña NVARCHAR(200),
    @fecha_inicio DATE,
    @fecha_fin DATE = NULL,
    @objetivo NVARCHAR(500) = NULL,
    @id_vacuna UNIQUEIDENTIFIER,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @id_campaña UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Campanas_Vacunacion (
            id_campaña, nombre_campaña, fecha_inicio, fecha_fin, objetivo, id_vacuna, estado
        )
        VALUES (
            @id_campaña, @nombre_campaña, @fecha_inicio, @fecha_fin, @objetivo, @id_vacuna, @estado
        );
        SELECT @id_campaña AS id_campaña;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ActualizarCampanaVacunacion
    @id_campaña UNIQUEIDENTIFIER,
    @nombre_campaña NVARCHAR(200),
    @fecha_inicio DATE,
    @fecha_fin DATE = NULL,
    @objetivo NVARCHAR(500) = NULL,
    @id_vacuna UNIQUEIDENTIFIER,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Campanas_Vacunacion
        SET
            nombre_campaña = @nombre_campaña,
            fecha_inicio = @fecha_inicio,
            fecha_fin = @fecha_fin,
            objetivo = @objetivo,
            id_vacuna = @id_vacuna,
            estado = @estado
        WHERE id_campaña = @id_campaña;
        IF @@ROWCOUNT = 0
            RAISERROR ('Campaña no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_EliminarCampanaVacunacion
    @id_campaña UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (
            SELECT 1 FROM Campana_Centro WHERE id_campaña = @id_campaña
        )
            RAISERROR ('No se puede eliminar la campaña debido a registros dependientes', 16, 1);

        DELETE FROM Campanas_Vacunacion WHERE id_campaña = @id_campaña;
        IF @@ROWCOUNT = 0
            RAISERROR ('Campaña no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ListarCampanasVacunacion
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Campanas_Vacunacion;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerCampanaPorId
    @id_campaña UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Campanas_Vacunacion WHERE id_campaña = @id_campaña;
END;
GO

-- 9. Campana_Centro
CREATE OR ALTER PROCEDURE sp_CrearCampanaCentro
    @id_campaña UNIQUEIDENTIFIER,
    @id_centro UNIQUEIDENTIFIER,
    @fecha_asignacion DATE
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @id_campaña_centro UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Campana_Centro (
            id_campaña_centro, id_campaña, id_centro, fecha_asignacion
        )
        VALUES (
            @id_campaña_centro, @id_campaña, @id_centro, @fecha_asignacion
        );
        SELECT @id_campaña_centro AS id_campaña_centro;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerCampanaCentro
    @id_campaña_centro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        cc.*,
        c.nombre_campaña,
        v.nombre_centro
    FROM Campana_Centro cc
    INNER JOIN Campanas_Vacunacion c ON cc.id_campaña = c.id_campaña
    INNER JOIN Centros_Vacunacion v ON cc.id_centro = v.id_centro
    WHERE cc.id_campaña_centro = @id_campaña_centro;
END;
GO

CREATE OR ALTER PROCEDURE sp_EliminarCampanaCentro
    @id_campaña_centro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Campana_Centro WHERE id_campaña_centro = @id_campaña_centro;
        IF @@ROWCOUNT = 0
            RAISERROR ('Asignación no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ListarCampanaCentro
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Campana_Centro;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerCampanaCentroPorId
    @id_campaña_centro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Campana_Centro WHERE id_campaña_centro = @id_campaña_centro;
END;
GO

-- 10. Citas
CREATE OR ALTER PROCEDURE sp_CrearCita
    @id_niño UNIQUEIDENTIFIER,
    @id_centro UNIQUEIDENTIFIER,
    @fecha_cita DATETIME2,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @id_cita UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Citas (
            id_cita, id_niño, id_centro, fecha_cita, estado
        )
        VALUES (
            @id_cita, @id_niño, @id_centro, @fecha_cita, @estado
        );
        SELECT @id_cita AS id_cita;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ActualizarCita
    @id_cita UNIQUEIDENTIFIER,
    @id_niño UNIQUEIDENTIFIER,
    @id_centro UNIQUEIDENTIFIER,
    @fecha_cita DATETIME2,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Citas
        SET
            id_niño = @id_niño,
            id_centro = @id_centro,
            fecha_cita = @fecha_cita,
            estado = @estado
        WHERE id_cita = @id_cita;
        IF @@ROWCOUNT = 0
            RAISERROR ('Cita no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_EliminarCita
    @id_cita UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Citas WHERE id_cita = @id_cita;
        IF @@ROWCOUNT = 0
            RAISERROR ('Cita no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ListarCitas
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Citas;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerCitaPorId
    @id_cita UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Citas WHERE id_cita = @id_cita;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerCitasPorCentro
    @id_centro UNIQUEIDENTIFIER,
    @fecha_inicio DATE,
    @fecha_fin DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        c.id_cita,
        n.nombre_completo AS nombre_niño,
        c.fecha_cita,
        c.estado
    FROM Citas c
    INNER JOIN Niños n ON c.id_niño = n.id_niño
    WHERE c.id_centro = @id_centro
    AND c.fecha_cita BETWEEN @fecha_inicio AND @fecha_fin
    ORDER BY c.fecha_cita;
END;
GO

-- 11. Historial_Vacunacion
CREATE OR ALTER PROCEDURE sp_RegistrarVacunacion
    @id_niño UNIQUEIDENTIFIER,
    @id_lote UNIQUEIDENTIFIER,
    @id_personal UNIQUEIDENTIFIER,
    @id_centro UNIQUEIDENTIFIER = NULL,
    @fecha_vacunacion DATETIME2,
    @dosis_aplicada INT,
    @sitio_aplicacion NVARCHAR(100) = NULL,
    @observaciones NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @id_historial UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Historial_Vacunacion (
            id_historial, id_niño, id_lote, id_personal, id_centro,
            fecha_vacunacion, dosis_aplicada, sitio_aplicacion, observaciones
        )
        VALUES (
            @id_historial, @id_niño, @id_lote, @id_personal, @id_centro,
            @fecha_vacunacion, @dosis_aplicada, @sitio_aplicacion, @observaciones
        );

        UPDATE Lotes_Vacunas
        SET cantidad_disponible = cantidad_disponible - 1
        WHERE id_lote = @id_lote AND cantidad_disponible > 0;

        IF @@ROWCOUNT = 0
            RAISERROR ('Lote no disponible o sin stock', 16, 1);

        COMMIT TRANSACTION;
        SELECT @id_historial AS id_historial;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerHistorialVacunacion
    @id_niño UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        h.*,
        v.nombre AS nombre_vacuna,
        c.nombre_centro,
        p.nombre_completo AS personal_responsable
    FROM Historial_Vacunacion h
    INNER JOIN Lotes_Vacunas l ON h.id_lote = l.id_lote
    INNER JOIN Vacunas v ON l.id_vacuna = v.id_vacuna
    INNER JOIN Centros_Vacunacion c ON h.id_centro = c.id_centro
    INNER JOIN Personal_Salud p ON h.id_personal = p.id_personal
    WHERE h.id_niño = @id_niño
    ORDER BY h.fecha_vacunacion DESC;
END;
GO

CREATE OR ALTER PROCEDURE sp_ActualizarVacunacion
    @id_historial UNIQUEIDENTIFIER,
    @id_niño UNIQUEIDENTIFIER,
    @id_lote UNIQUEIDENTIFIER,
    @id_personal UNIQUEIDENTIFIER,
    @id_centro UNIQUEIDENTIFIER = NULL,
    @fecha_vacunacion DATETIME2,
    @dosis_aplicada INT,
    @sitio_aplicacion NVARCHAR(100) = NULL,
    @observaciones NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Historial_Vacunacion
        SET
            id_niño = @id_niño,
            id_lote = @id_lote,
            id_personal = @id_personal,
            id_centro = @id_centro,
            fecha_vacunacion = @fecha_vacunacion,
            dosis_aplicada = @dosis_aplicada,
            sitio_aplicacion = @sitio_aplicacion,
            observaciones = @observaciones
        WHERE id_historial = @id_historial;
        IF @@ROWCOUNT = 0
            RAISERROR ('Historial no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_EliminarVacunacion
    @id_historial UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Historial_Vacunacion WHERE id_historial = @id_historial;
        IF @@ROWCOUNT = 0
            RAISERROR ('Historial no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ListarHistorialVacunacion
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Historial_Vacunacion;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerHistorialPorId
    @id_historial UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Historial_Vacunacion WHERE id_historial = @id_historial;
END;
GO

-- 12. Inventario_Suministros
CREATE OR ALTER PROCEDURE sp_ActualizarSuministro
    @id_suministro UNIQUEIDENTIFIER,
    @nombre_suministro NVARCHAR(100),
    @tipo_suministro NVARCHAR(50) = NULL,
    @cantidad_total INT,
    @cantidad_disponible INT,
    @id_centro UNIQUEIDENTIFIER,
    @fecha_entrada DATE,
    @fecha_vencimiento DATE = NULL,
    @proveedor NVARCHAR(200) = NULL,
    @condiciones_almacenamiento NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Inventario_Suministros
        SET
            nombre_suministro = @nombre_suministro,
            tipo_suministro = @tipo_suministro,
            cantidad_total = @cantidad_total,
            cantidad_disponible = @cantidad_disponible,
            id_centro = @id_centro,
            fecha_entrada = @fecha_entrada,
            fecha_vencimiento = @fecha_vencimiento,
            proveedor = @proveedor,
            condiciones_almacenamiento = @condiciones_almacenamiento
        WHERE id_suministro = @id_suministro;
        IF @@ROWCOUNT = 0
            RAISERROR ('Suministro no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_EliminarSuministro
    @id_suministro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Inventario_Suministros WHERE id_suministro = @id_suministro;
        IF @@ROWCOUNT = 0
            RAISERROR ('Suministro no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_CrearSuministro
    @nombre_suministro NVARCHAR(100),
    @tipo_suministro NVARCHAR(50) = NULL,
    @cantidad_total INT,
    @cantidad_disponible INT,
    @id_centro UNIQUEIDENTIFIER,
    @fecha_entrada DATE,
    @fecha_vencimiento DATE = NULL,
    @proveedor NVARCHAR(200) = NULL,
    @condiciones_almacenamiento NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @id_suministro UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Inventario_Suministros (
            id_suministro, nombre_suministro, tipo_suministro, cantidad_total, cantidad_disponible,
            id_centro, fecha_entrada, fecha_vencimiento, proveedor, condiciones_almacenamiento
        )
        VALUES (
            @id_suministro, @nombre_suministro, @tipo_suministro, @cantidad_total, @cantidad_disponible,
            @id_centro, @fecha_entrada, @fecha_vencimiento, @proveedor, @condiciones_almacenamiento
        );
        SELECT @id_suministro AS id_suministro;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ListarSuministros
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Inventario_Suministros;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerSuministroPorId
    @id_suministro UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Inventario_Suministros WHERE id_suministro = @id_suministro;
END;
GO

-- 13. Esquema_Vacunacion
CREATE OR ALTER PROCEDURE sp_CrearEsquemaVacunacion
    @id_vacuna UNIQUEIDENTIFIER,
    @orden_dosis INT,
    @edad_recomendada NVARCHAR(50),
    @descripcion NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @id_esquema UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Esquema_Vacunacion (
            id_esquema, id_vacuna, orden_dosis, edad_recomendada, descripcion
        )
        VALUES (
            @id_esquema, @id_vacuna, @orden_dosis, @edad_recomendada, @descripcion
        );
        SELECT @id_esquema AS id_esquema;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ActualizarEsquemaVacunacion
    @id_esquema UNIQUEIDENTIFIER,
    @id_vacuna UNIQUEIDENTIFIER,
    @orden_dosis INT,
    @edad_recomendada NVARCHAR(50),
    @descripcion NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Esquema_Vacunacion
        SET
            id_vacuna = @id_vacuna,
            orden_dosis = @orden_dosis,
            edad_recomendada = @edad_recomendada,
            descripcion = @descripcion
        WHERE id_esquema = @id_esquema;
        IF @@ROWCOUNT = 0
            RAISERROR ('Esquema no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_EliminarEsquemaVacunacion
    @id_esquema UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Esquema_Vacunacion WHERE id_esquema = @id_esquema;
        IF @@ROWCOUNT = 0
            RAISERROR ('Esquema no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ListarEsquemasVacunacion
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Esquema_Vacunacion;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerEsquemaPorId
    @id_esquema UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Esquema_Vacunacion WHERE id_esquema = @id_esquema;
END;
GO

-- 14. Auditoria
CREATE OR ALTER PROCEDURE sp_RegistrarAuditoria
    @tabla_afectada NVARCHAR(100),
    @id_registro UNIQUEIDENTIFIER,
    @id_usuario UNIQUEIDENTIFIER,
    @accion NVARCHAR(20),
    @detalles NVARCHAR(500) = NULL,
    @ip_origen NVARCHAR(15) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @id_auditoria UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Auditoria (
            id_auditoria, tabla_afectada, id_registro, id_usuario, accion, detalles, ip_origen, fecha_registro
        )
        VALUES (
            @id_auditoria, @tabla_afectada, @id_registro, @id_usuario, @accion, @detalles, @ip_origen, SYSDATETIME()
        );
        SELECT @id_auditoria AS id_auditoria;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ActualizarAuditoria
    @id_auditoria UNIQUEIDENTIFIER,
    @tabla_afectada NVARCHAR(100),
    @id_registro UNIQUEIDENTIFIER,
    @id_usuario UNIQUEIDENTIFIER,
    @accion NVARCHAR(20),
    @detalles NVARCHAR(500) = NULL,
    @ip_origen NVARCHAR(15) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Auditoria
        SET
            tabla_afectada = @tabla_afectada,
            id_registro = @id_registro,
            id_usuario = @id_usuario,
            accion = @accion,
            detalles = @detalles,
            ip_origen = @ip_origen,
            fecha_registro = SYSDATETIME()
        WHERE id_auditoria = @id_auditoria;
        IF @@ROWCOUNT = 0
            RAISERROR ('Auditoría no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_EliminarAuditoria
    @id_auditoria UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Auditoria WHERE id_auditoria = @id_auditoria;
        IF @@ROWCOUNT = 0
            RAISERROR ('Auditoría no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ListarAuditorias
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Auditoria;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerAuditoriaPorId
    @id_auditoria UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Auditoria WHERE id_auditoria = @id_auditoria;
END;
GO

-- 15. Alertas
CREATE OR ALTER PROCEDURE sp_CrearAlerta
    @id_niño UNIQUEIDENTIFIER,
    @tipo_alerta NVARCHAR(100),
    @fecha_alerta DATETIME2,
    @descripcion NVARCHAR(500) = NULL,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @id_alerta UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Alertas (
            id_alerta, id_niño, tipo_alerta, fecha_alerta, descripcion, estado
        )
        VALUES (
            @id_alerta, @id_niño, @tipo_alerta, @fecha_alerta, @descripcion, @estado
        );
        SELECT @id_alerta AS id_alerta;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ActualizarAlerta
    @id_alerta UNIQUEIDENTIFIER,
    @id_niño UNIQUEIDENTIFIER,
    @tipo_alerta NVARCHAR(100),
    @fecha_alerta DATETIME2,
    @descripcion NVARCHAR(500) = NULL,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Alertas
        SET
            id_niño = @id_niño,
            tipo_alerta = @tipo_alerta,
            fecha_alerta = @fecha_alerta,
            descripcion = @descripcion,
            estado = @estado
        WHERE id_alerta = @id_alerta;
        IF @@ROWCOUNT = 0
            RAISERROR ('Alerta no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_EliminarAlerta
    @id_alerta UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Alertas WHERE id_alerta = @id_alerta;
        IF @@ROWCOUNT = 0
            RAISERROR ('Alerta no encontrada', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ListarAlertas
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Alertas;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerAlertaPorId
    @id_alerta UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Alertas WHERE id_alerta = @id_alerta;
END;
GO

-- 16. Adverse Events (Eventos_Adversos)
CREATE OR ALTER PROCEDURE sp_CrearEventoAdverso
    @id_historial UNIQUEIDENTIFIER,
    @id_personal_reportante UNIQUEIDENTIFIER,
    @fecha_reporte DATETIME2,
    @tipo_evento NVARCHAR(100),
    @severidad NVARCHAR(20),
    @descripcion NVARCHAR(500) = NULL,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @id_evento UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Eventos_Adversos (
            id_evento, id_historial, id_personal_reportante, fecha_reporte, tipo_evento,
            severidad, descripcion, estado
        )
        VALUES (
            @id_evento, @id_historial, @id_personal_reportante, @fecha_reporte, @tipo_evento,
            @severidad, @descripcion, @estado
        );
        SELECT @id_evento AS id_evento;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ActualizarEventoAdverso
    @id_evento UNIQUEIDENTIFIER,
    @id_historial UNIQUEIDENTIFIER,
    @id_personal_reportante UNIQUEIDENTIFIER,
    @fecha_reporte DATETIME2,
    @tipo_evento NVARCHAR(100),
    @severidad NVARCHAR(20),
    @descripcion NVARCHAR(500) = NULL,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Eventos_Adversos
        SET
            id_historial = @id_historial,
            id_personal_reportante = @id_personal_reportante,
            fecha_reporte = @fecha_reporte,
            tipo_evento = @tipo_evento,
            severidad = @severidad,
            descripcion = @descripcion,
            estado = @estado
        WHERE id_evento = @id_evento;
        IF @@ROWCOUNT = 0
            RAISERROR ('Evento adverso no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_EliminarEventoAdverso
    @id_evento UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Eventos_Adversos WHERE id_evento = @id_evento;
        IF @@ROWCOUNT = 0
            RAISERROR ('Evento adverso no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ListarEventosAdversos
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Eventos_Adversos;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerEventoAdversoPorId
    @id_evento UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Eventos_Adversos WHERE id_evento = @id_evento;
END;
GO

-- 17. Vaccination Schedules (NationalCalendars no está explícito, asumimos Esquema_Vacunacion)
CREATE OR ALTER PROCEDURE sp_CrearCalendarioNacional
    @nombre_calendario NVARCHAR(100),
    @descripcion NVARCHAR(500) = NULL,
    @id_pais UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @id_calendario UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Calendario_Nacional (
            id_calendario, nombre_calendario, descripcion, id_pais
        )
        VALUES (
            @id_calendario, @nombre_calendario, @descripcion, @id_pais
        );
        SELECT @id_calendario AS id_calendario;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ActualizarCalendarioNacional
    @id_calendario UNIQUEIDENTIFIER,
    @nombre_calendario NVARCHAR(100),
    @descripcion NVARCHAR(500) = NULL,
    @id_pais UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Calendario_Nacional
        SET
            nombre_calendario = @nombre_calendario,
            descripcion = @descripcion,
            id_pais = @id_pais
        WHERE id_calendario = @id_calendario;
        IF @@ROWCOUNT = 0
            RAISERROR ('Calendario no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_EliminarCalendarioNacional
    @id_calendario UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Calendario_Nacional WHERE id_calendario = @id_calendario;
        IF @@ROWCOUNT = 0
            RAISERROR ('Calendario no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ListarCalendariosNacionales
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Calendario_Nacional;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerCalendarioPorId
    @id_calendario UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Calendario_Nacional WHERE id_calendario = @id_calendario;
END;
GO

-- 18. Uso_Suministros (Supply Usage) [Continuación]
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DELETE FROM Uso_Suministros WHERE id_uso = @id_uso;
        IF @@ROWCOUNT = 0
            RAISERROR ('Uso de suministro no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ListarUsoSuministros
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Uso_Suministros;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerUsoSuministroPorId
    @id_uso UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Uso_Suministros WHERE id_uso = @id_uso;
END;
GO

-- 19. Paises
CREATE OR ALTER PROCEDURE sp_CrearPais
    @nombre_pais NVARCHAR(100),
    @codigo_pais NVARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        DECLARE @id_pais UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Paises (
            id_pais, nombre_pais, codigo_pais
        )
        VALUES (
            @id_pais, @nombre_pais, @codigo_pais
        );
        SELECT @id_pais AS id_pais;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ActualizarPais
    @id_pais UNIQUEIDENTIFIER,
    @nombre_pais NVARCHAR(100),
    @codigo_pais NVARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        UPDATE Paises
        SET
            nombre_pais = @nombre_pais,
            codigo_pais = @codigo_pais
        WHERE id_pais = @id_pais;
        IF @@ROWCOUNT = 0
            RAISERROR ('País no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_EliminarPais
    @id_pais UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF EXISTS (
            SELECT 1 FROM Niños WHERE nacionalidad = @id_pais OR pais_nacimiento = @id_pais
            UNION
            SELECT 1 FROM Tutores WHERE nacionalidad = @id_pais
            UNION
            SELECT 1 FROM Calendario_Nacional WHERE id_pais = @id_pais
        )
            RAISERROR ('No se puede eliminar el país debido a registros dependientes', 16, 1);

        DELETE FROM Paises WHERE id_pais = @id_pais;
        IF @@ROWCOUNT = 0
            RAISERROR ('País no encontrado', 16, 1);
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE sp_ListarPaises
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Paises;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerPaisPorId
    @id_pais UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Paises WHERE id_pais = @id_pais;
END;
GO

-- 20. Reportes
CREATE OR ALTER PROCEDURE sp_ObtenerCoberturaVacunacion
    @id_centro UNIQUEIDENTIFIER,
    @fecha_inicio DATE,
    @fecha_fin DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        v.nombre AS nombre_vacuna,
        COUNT(h.id_historial) AS total_vacunados,
        COUNT(DISTINCT h.id_niño) AS niños_vacunados
    FROM Historial_Vacunacion h
    INNER JOIN Lotes_Vacunas l ON h.id_lote = l.id_lote
    INNER JOIN Vacunas v ON l.id_vacuna = v.id_vacuna
    WHERE h.id_centro = @id_centro
    AND h.fecha_vacunacion BETWEEN @fecha_inicio AND @fecha_fin
    GROUP BY v.nombre
    ORDER BY v.nombre;
END;
GO

CREATE OR ALTER PROCEDURE sp_ObtenerEsquemasIncompletos
    @id_niño UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        v.nombre AS nombre_vacuna,
        e.orden_dosis,
        e.edad_recomendada
    FROM Esquema_Vacunacion e
    INNER JOIN Vacunas v ON e.id_vacuna = v.id_vacuna
    WHERE NOT EXISTS (
        SELECT 1 
        FROM Historial_Vacunacion h 
        INNER JOIN Lotes_Vacunas l ON h.id_lote = l.id_lote
        WHERE h.id_niño = @id_niño 
        AND l.id_vacuna = e.id_vacuna 
        AND h.dosis_aplicada = e.orden_dosis
    )
    ORDER BY v.nombre, e.orden_dosis;
END;
GO

CREATE OR ALTER PROCEDURE sp_ListarReportes
AS
BEGIN
    SET NOCOUNT ON;
    SELECT DISTINCT tipo_reporte AS tipo, descripcion FROM Reportes_Disponibles;
END;
GO

